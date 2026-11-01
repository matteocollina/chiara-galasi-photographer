import "server-only";
import { randomUUID } from "node:crypto";
import { db, ensureSchema } from "./db";
import { assertCategory } from "./catalog";
import {
  cloud,
  uploadParameters,
  validateAsset,
  type VerifiedAsset,
} from "./cloudinary";
import { HttpError } from "./http";

export async function signUpload(categoryId: string, session: string) {
  await ensureSchema();
  const id = randomUUID();
  const publicId = `chiara-portfolio/uploads/${id}`;
  const signed = uploadParameters(publicId);
  const tx = await db().transaction("write");
  try {
    await assertCategory(tx, categoryId);
    const pending = await tx.execute({
      sql: "SELECT COUNT(*) AS count FROM upload_intents WHERE expires_at > ?",
      args: [Date.now()],
    });
    if (Number(pending.rows[0]?.count) >= 30)
      throw new HttpError(
        429,
        "Troppi caricamenti in attesa. Completa quelli in corso o riprova più tardi.",
      );
    await tx.execute({
      sql: "INSERT INTO upload_intents (id, public_id, category_id, session_id, expires_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, publicId, categoryId, session, Date.now() + 60 * 60_000],
    });
    // Reserve cleanup before issuing a signature, including abandoned/failed uploads.
    await tx.execute({
      sql: "INSERT INTO cleanup_jobs (public_id, available_after) VALUES (?, ?)",
      args: [publicId, Date.now() + 2 * 60 * 60_000],
    });
    await tx.commit();
  } finally {
    tx.close();
  }
  return { ...signed, uploadId: id };
}
export async function completeUpload(
  uploadId: string,
  alt: string,
  session: string,
) {
  await ensureSchema();
  // Completion is idempotent if the response was lost after the first commit.
  const existing = await db().execute({
    sql: "SELECT id FROM photos WHERE id = ?",
    args: [uploadId],
  });
  if (existing.rows.length) return;
  const intent = await db().execute({
    sql: "SELECT * FROM upload_intents WHERE id = ? AND session_id = ? AND expires_at > ?",
    args: [uploadId, session, Date.now()],
  });
  const row = intent.rows[0];
  if (!row)
    throw new HttpError(
      410,
      "Caricamento scaduto. Riprova a caricare la foto.",
    );
  const asset = validateAsset(
    (await cloud().api.resource(String(row.public_id), {
      resource_type: "image",
      type: "upload",
    })) as VerifiedAsset,
    String(row.public_id),
  );
  const tx = await db().transaction("write");
  try {
    const current = await tx.execute({
      sql: "SELECT * FROM upload_intents WHERE id = ? AND session_id = ? AND expires_at > ?",
      args: [uploadId, session, Date.now()],
    });
    if (!current.rows.length) {
      const completed = await tx.execute({
        sql: "SELECT id FROM photos WHERE id = ?",
        args: [uploadId],
      });
      if (!completed.rows.length)
        throw new HttpError(410, "Caricamento scaduto.");
    } else {
      await assertCategory(tx, String(row.category_id));
      await tx.execute({
        sql: "INSERT INTO photos (id, category_id, src, public_id, alt, width, height, position) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM photos WHERE category_id = ?))",
        args: [
          uploadId,
          String(row.category_id),
          asset.secure_url,
          asset.public_id,
          alt,
          asset.width,
          asset.height,
          String(row.category_id),
        ],
      });
      await tx.execute({
        sql: "UPDATE categories SET cover_id = ? WHERE id = ? AND cover_id IS NULL",
        args: [uploadId, String(row.category_id)],
      });
      await tx.execute({
        sql: "DELETE FROM cleanup_jobs WHERE public_id = ?",
        args: [asset.public_id],
      });
      await tx.execute({
        sql: "DELETE FROM upload_intents WHERE id = ?",
        args: [uploadId],
      });
    }
    await tx.commit();
  } finally {
    tx.close();
  }
}
export async function runCleanup() {
  await ensureSchema();
  const jobs = await db().execute({
    sql: "SELECT public_id FROM cleanup_jobs WHERE available_after <= ? ORDER BY available_after LIMIT 20",
    args: [Date.now()],
  });
  if (!jobs.rows.length) return;
  const sdk = cloud();
  for (const row of jobs.rows) {
    const publicId = String(row.public_id);
    const referenced = await db().execute({
      sql: "SELECT id FROM photos WHERE public_id = ?",
      args: [publicId],
    });
    if (referenced.rows.length) continue;
    try {
      const result = await sdk.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });
      if (!["ok", "not found"].includes(result.result))
        throw new Error("Eliminazione non confermata.");
      await db().batch(
        [
          {
            sql: "DELETE FROM upload_intents WHERE public_id = ? AND expires_at <= ?",
            args: [publicId, Date.now()],
          },
          {
            sql: "DELETE FROM cleanup_jobs WHERE public_id = ?",
            args: [publicId],
          },
        ],
        "write",
      );
    } catch {
      await db().execute({
        sql: "UPDATE cleanup_jobs SET attempts = attempts + 1, last_error = 'Eliminazione non riuscita', available_after = ? WHERE public_id = ?",
        args: [Date.now() + 60_000, publicId],
      });
    }
  }
}
export async function cleanupCount() {
  const result = await db().execute({
    sql: "SELECT COUNT(*) AS count FROM cleanup_jobs WHERE available_after <= ? OR attempts > 0",
    args: [Date.now()],
  });
  return Number(result.rows[0]?.count ?? 0);
}
