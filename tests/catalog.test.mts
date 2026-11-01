import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { db, ensureSchema } from "../lib/server/db";
import {
  mutateCatalog,
  readCatalog,
  originalCategories,
} from "../lib/server/catalog";
import { mutationSchema, slugSchema } from "../lib/validation";
import { signSession, verifySession } from "../lib/server/session-crypto";
import { assertOrigin } from "../lib/server/http";
import { cloud, validateAsset } from "../lib/server/cloudinary";
import {
  completeUpload,
  signUpload,
  runCleanup,
  cleanupCount,
} from "../lib/server/uploads";

const directory = await mkdtemp(path.join(tmpdir(), "chiara-catalog-"));
process.env.STORAGE_TURSO_DATABASE_URL = `file:${path.join(directory, "test.db")}`;
process.env.ADMIN_SESSION_SECRET =
  "test-only-secret-with-at-least-32-characters";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";

await test("session signatures reject tampering, malformed values and rotated secrets", () => {
  const id = "a".repeat(64);
  const signed = signSession(id);
  assert.equal(verifySession(signed), id);
  assert.equal(verifySession(signed + "x"), null);
  assert.equal(verifySession("bad.signature"), null);
  assert.equal(verifySession(undefined), null);
  const previous = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET =
    "another-secret-with-at-least-32-characters";
  assert.equal(verifySession(signed), null);
  process.env.ADMIN_SESSION_SECRET = previous;
});
await test("mutations enforce origin and reserved slugs", () => {
  assert.throws(() =>
    assertOrigin(
      new Request("https://site.example/api/admin/mutate", {
        headers: { origin: "https://evil.example" },
      }),
    ),
  );
  assert.throws(() =>
    assertOrigin(new Request("https://site.example/api/admin/mutate")),
  );
  assert.doesNotThrow(() =>
    assertOrigin(
      new Request("https://site.example/api/admin/mutate", {
        headers: { origin: "https://site.example" },
      }),
    ),
  );
  for (const value of [
    "admin",
    "api",
    "chi-sono",
    "faq",
    "Invalid",
    "a/b",
    "",
    "-bad",
  ])
    assert.equal(slugSchema.safeParse(value).success, false);
  assert.equal(slugSchema.safeParse("nuova-categoria-2026").success, true);
  assert.equal(
    mutationSchema.safeParse({ action: "updatePhoto", id: "p", alt: "" })
      .success,
    false,
  );
});
await test("legacy import retains category order, covers and all gallery images", () => {
  const categories = originalCategories();
  assert.deepEqual(
    categories.map((c) => c.slug),
    ["ritratti", "maternita-e-nascite", "food"],
  );
  for (const category of categories)
    assert.ok(category.images.some((photo) => photo.id === category.coverId));
  assert.equal(categories[0].images.length, 30);
  assert.equal(categories[1].images.length, 5);
  assert.equal(categories[2].images.length, 7);
});
await test("catalog transactions preserve covers, membership, uniqueness and deletion constraints", async () => {
  await ensureSchema();
  for (const slug of ["test-one", "test-two"])
    await mutateCatalog({
      action: "createCategory",
      slug,
      name: slug,
      title: slug,
      intro: "",
      masonry: true,
    });
  const categories = await readCatalog();
  const [a, b] = categories;
  assert.equal(categories.length, 2);
  await assert.rejects(
    () =>
      mutateCatalog({
        action: "createCategory",
        slug: "test-one",
        name: "Duplicate",
        title: "Duplicate",
        intro: "",
        masonry: false,
      }),
    /già/,
  );
  await db().execute({
    sql: "INSERT INTO photos VALUES ('p1', ?, '/test.jpg', 'test/p1', 'Photo', 100, 200, 0)",
    args: [a.id],
  });
  await db().execute({
    sql: "INSERT INTO photos VALUES ('p2', ?, '/test2.jpg', 'test/p2', 'Photo 2', 200, 100, 1)",
    args: [a.id],
  });
  await assert.rejects(
    () => mutateCatalog({ action: "setCover", id: b.id, photoId: "p1" }),
    /appartenere/,
  );
  await mutateCatalog({ action: "setCover", id: a.id, photoId: "p1" });
  await assert.rejects(
    () => mutateCatalog({ action: "deleteCategory", id: a.id }),
    /prima/,
  );
  await assert.rejects(
    () =>
      mutateCatalog({
        action: "reorderPhotos",
        categoryId: a.id,
        ids: ["p1", "p1"],
      }),
    /cambiato/,
  );
  await mutateCatalog({
    action: "reorderPhotos",
    categoryId: a.id,
    ids: ["p2", "p1"],
  });
  await mutateCatalog({ action: "reorderCategories", ids: [b.id, a.id] });
  assert.equal((await readCatalog())[0].id, b.id);
  assert.equal((await readCatalog())[1].images[0].id, "p2");
  await mutateCatalog({ action: "deletePhoto", id: "p1" });
  assert.equal((await readCatalog())[1].coverId, "p2");
  assert.equal(await cleanupCount(), 1);
  const sdk = cloud();
  const original = sdk.uploader.destroy;
  sdk.uploader.destroy = (async () => {
    throw new Error("provider offline");
  }) as typeof original;
  await runCleanup();
  const failed = await db().execute(
    "SELECT attempts FROM cleanup_jobs WHERE public_id = 'test/p1'",
  );
  assert.equal(Number(failed.rows[0].attempts), 1);
  await db().execute("UPDATE cleanup_jobs SET available_after = 0");
  sdk.uploader.destroy = (async () => ({ result: "ok" })) as typeof original;
  await runCleanup();
  sdk.uploader.destroy = original;
  assert.equal(await cleanupCount(), 0);
  await mutateCatalog({ action: "deleteCategory", id: b.id });
  assert.equal((await readCatalog()).length, 1);
});
await test("upload completion verifies provider data and is idempotent; expired uploads cannot publish", async () => {
  const category = (await readCatalog())[0];
  const signed = await signUpload(category.id, "session-a");
  assert.ok(signed.signature);
  assert.equal(signed.params.overwrite, false);
  await assert.rejects(
    () => completeUpload(signed.uploadId, "Photo", "another-session"),
    /scaduto/,
  );
  const sdk = cloud();
  const original = sdk.api.resource;
  const valid = {
    public_id: signed.params.public_id,
    secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v1/${signed.params.public_id}.jpg`,
    width: 1000,
    height: 1500,
    bytes: 123456,
    format: "jpg",
    resource_type: "image",
    type: "upload",
  };
  assert.throws(
    () => validateAsset({ ...valid, width: 5000 }, valid.public_id),
    /limiti/,
  );
  assert.throws(
    () =>
      validateAsset(
        { ...valid, secure_url: "https://evil.example/photo.jpg" },
        valid.public_id,
      ),
    /limiti/,
  );
  sdk.api.resource = (async () => ({
    ...valid,
    format: "png",
  })) as typeof original;
  await assert.rejects(
    () => completeUpload(signed.uploadId, "Photo", "session-a"),
    /limiti/,
  );
  sdk.api.resource = (async () => valid) as typeof original;
  await completeUpload(signed.uploadId, "Photo", "session-a");
  await completeUpload(signed.uploadId, "Photo", "session-a");
  assert.equal(
    (
      await db().execute({
        sql: "SELECT id FROM photos WHERE id = ?",
        args: [signed.uploadId],
      })
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await db().execute({
        sql: "SELECT public_id FROM cleanup_jobs WHERE public_id = ?",
        args: [signed.params.public_id],
      })
    ).rows.length,
    0,
  );
  const expired = await signUpload(category.id, "session-a");
  await db().execute({
    sql: "UPDATE upload_intents SET expires_at = 0 WHERE id = ?",
    args: [expired.uploadId],
  });
  await assert.rejects(
    () => completeUpload(expired.uploadId, "Photo", "session-a"),
    /scaduto/,
  );
  sdk.api.resource = original;
});

after(async () => {
  db().close();
  await rm(directory, { recursive: true, force: true });
});
