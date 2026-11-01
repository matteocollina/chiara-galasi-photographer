import "server-only";
import type { Row, Transaction } from "@libsql/client";
import { randomUUID } from "node:crypto";
import originals from "@/app/content/galleries.json";
import type { Category, Photo } from "@/lib/types";
import { sameMembers, type Mutation } from "@/lib/validation";
import { db, ensureSchema, hasDatabase } from "./db";
import { HttpError } from "./http";

const legacyNames: Record<string, string> = {
  ritratti: "Portrait",
  "maternita-e-nascite": "Maternity & New Born",
  food: "Food",
};
const legacyCovers: Record<string, string> = {
  ritratti: "/images/Portrait/eli%201.jpg",
  "maternita-e-nascite": "/images/Maternity%20%26%20New%20Born/3.jpg",
  food: "/images/Food/vongole.jpg",
};
export function originalCategories(): Category[] {
  return ["ritratti", "maternita-e-nascite", "food"].map((slug, position) => {
    const gallery = originals[slug as keyof typeof originals];
    const images = gallery.images.map((image, index) => ({
      ...image,
      id: `${slug}-${index}`,
      publicId: "",
      categoryId: slug,
      position: index,
    }));
    // Food's home cover wasn't part of the old gallery; retain it during migration.
    let cover = images.find(
      (image) =>
        decodeURIComponent(image.src) ===
        decodeURIComponent(legacyCovers[slug]),
    );
    if (!cover) {
      cover = {
        id: `${slug}-cover`,
        publicId: "",
        categoryId: slug,
        src: legacyCovers[slug],
        alt: legacyNames[slug],
        width: 2848,
        height: 4272,
        position: images.length,
      };
      images.push(cover);
    }
    return {
      id: slug,
      slug,
      name: legacyNames[slug],
      title: gallery.title,
      intro: gallery.intro,
      coverId: cover.id,
      position,
      masonry: slug === "ritratti",
      images,
    };
  });
}
function photo(row: Row): Photo {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    src: String(row.src),
    publicId: String(row.public_id),
    alt: String(row.alt),
    width: Number(row.width),
    height: Number(row.height),
    position: Number(row.position),
  };
}
export async function readCatalog(): Promise<Category[]> {
  if (!hasDatabase()) return originalCategories();
  await ensureSchema();
  const [categories, photos] = await db().batch(
    [
      "SELECT * FROM categories ORDER BY position, id",
      "SELECT * FROM photos ORDER BY position, id",
    ],
    "read",
  );
  return categories.rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    title: String(row.title),
    intro: String(row.intro),
    coverId: row.cover_id === null ? null : String(row.cover_id),
    position: Number(row.position),
    masonry: Boolean(row.masonry),
    images: photos.rows.filter((p) => p.category_id === row.id).map(photo),
  }));
}
export async function assertCategory(tx: Transaction, id: string) {
  const result = await tx.execute({
    sql: "SELECT id FROM categories WHERE id = ?",
    args: [id],
  });
  if (!result.rows.length) throw new HttpError(404, "Categoria non trovata.");
}
export async function mutateCatalog(input: Mutation) {
  await ensureSchema();
  const tx = await db().transaction("write");
  try {
    switch (input.action) {
      case "createCategory": {
        const exists = await tx.execute({
          sql: "SELECT id FROM categories WHERE slug = ?",
          args: [input.slug],
        });
        if (exists.rows.length)
          throw new HttpError(
            409,
            "Esiste già una categoria con questo indirizzo.",
          );
        await tx.execute({
          sql: "INSERT INTO categories (id, slug, name, title, intro, position, masonry) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM categories), ?)",
          args: [
            randomUUID(),
            input.slug,
            input.name,
            input.title,
            input.intro,
            Number(input.masonry),
          ],
        });
        break;
      }
      case "updateCategory":
        await assertCategory(tx, input.id);
        await tx.execute({
          sql: "UPDATE categories SET name = ?, title = ?, intro = ?, masonry = ? WHERE id = ?",
          args: [
            input.name,
            input.title,
            input.intro,
            Number(input.masonry),
            input.id,
          ],
        });
        break;
      case "deleteCategory": {
        await assertCategory(tx, input.id);
        const count = await tx.execute({
          sql: "SELECT id FROM photos WHERE category_id = ? LIMIT 1",
          args: [input.id],
        });
        if (count.rows.length)
          throw new HttpError(
            409,
            "Elimina prima tutte le foto della categoria.",
          );
        const active = await tx.execute({
          sql: "SELECT id FROM upload_intents WHERE category_id = ? AND expires_at > ? LIMIT 1",
          args: [input.id, Date.now()],
        });
        if (active.rows.length)
          throw new HttpError(
            409,
            "Sono presenti caricamenti in corso. Riprova dopo la loro scadenza.",
          );
        await tx.execute({
          sql: "DELETE FROM upload_intents WHERE category_id = ?",
          args: [input.id],
        });
        await tx.execute({
          sql: "DELETE FROM categories WHERE id = ?",
          args: [input.id],
        });
        break;
      }
      case "setCover": {
        const exists = await tx.execute({
          sql: "SELECT id FROM photos WHERE id = ? AND category_id = ?",
          args: [input.photoId, input.id],
        });
        if (!exists.rows.length)
          throw new HttpError(
            400,
            "La copertina deve appartenere alla categoria.",
          );
        await tx.execute({
          sql: "UPDATE categories SET cover_id = ? WHERE id = ?",
          args: [input.photoId, input.id],
        });
        break;
      }
      case "updatePhoto": {
        const result = await tx.execute({
          sql: "UPDATE photos SET alt = ? WHERE id = ?",
          args: [input.alt, input.id],
        });
        if (!result.rowsAffected) throw new HttpError(404, "Foto non trovata.");
        break;
      }
      case "deletePhoto": {
        const result = await tx.execute({
          sql: "SELECT public_id, category_id FROM photos WHERE id = ?",
          args: [input.id],
        });
        const row = result.rows[0];
        if (!row) throw new HttpError(404, "Foto non trovata.");
        await tx.execute({
          sql: "INSERT OR IGNORE INTO cleanup_jobs (public_id, available_after) VALUES (?, ?)",
          args: [String(row.public_id), Date.now()],
        });
        await tx.execute({
          sql: "DELETE FROM photos WHERE id = ?",
          args: [input.id],
        });
        await tx.execute({
          sql: "UPDATE categories SET cover_id = (SELECT id FROM photos WHERE category_id = ? ORDER BY position, id LIMIT 1) WHERE id = ? AND cover_id = ?",
          args: [String(row.category_id), String(row.category_id), input.id],
        });
        break;
      }
      case "reorderCategories":
      case "reorderPhotos": {
        const categories = input.action === "reorderCategories";
        const result = await tx.execute(
          categories
            ? "SELECT id FROM categories"
            : {
                sql: "SELECT id FROM photos WHERE category_id = ?",
                args: [input.categoryId],
              },
        );
        if (
          !sameMembers(
            result.rows.map((row) => String(row.id)),
            input.ids,
          )
        )
          throw new HttpError(
            409,
            "L'elenco è cambiato. Aggiorna il pannello e riprova.",
          );
        for (const [index, id] of input.ids.entries())
          await tx.execute({
            sql: categories
              ? "UPDATE categories SET position = ? WHERE id = ?"
              : "UPDATE photos SET position = ? WHERE id = ?",
            args: [index, id],
          });
        break;
      }
      case "retryCleanup":
        break;
    }
    await tx.commit();
  } finally {
    tx.close();
  }
}
