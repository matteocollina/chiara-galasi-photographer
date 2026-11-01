import "./environment";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { originalCategories } from "../lib/server/catalog";
import { db, ensureSchema } from "../lib/server/db";
import { cloud } from "../lib/server/cloudinary";

async function main() {
  await ensureSchema();
  const sdk = cloud();
  const verify = process.argv.includes("--verify");
  for (const category of originalCategories()) {
    if (!verify)
      await db().execute({
        sql: "INSERT OR IGNORE INTO categories (id, slug, name, title, intro, position, masonry) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          category.id,
          category.slug,
          category.name,
          category.title,
          category.intro,
          category.position,
          Number(category.masonry),
        ],
      });
    const savedCategory = await db().execute({
      sql: "SELECT id, slug FROM categories WHERE id = ?",
      args: [category.id],
    });
    if (
      !savedCategory.rows.length ||
      savedCategory.rows[0].slug !== category.slug
    )
      throw new Error(`Categoria ${category.slug} mancante o in conflitto.`);
    for (const photo of category.images) {
      const publicId = `chiara-portfolio/import/${createHash("sha256").update(decodeURIComponent(photo.src)).digest("hex").slice(0, 32)}`;
      const exists = await db().execute({
        sql: "SELECT public_id, src, width, height FROM photos WHERE id = ?",
        args: [photo.id],
      });
      if (verify) {
        const asset = await sdk.api.resource(publicId, {
          resource_type: "image",
          type: "upload",
        });
        const saved = exists.rows[0];
        if (
          !saved ||
          saved.public_id !== publicId ||
          saved.src !== asset.secure_url ||
          Number(saved.width) !== asset.width ||
          Number(saved.height) !== asset.height ||
          asset.format !== "jpg" ||
          Math.max(asset.width, asset.height) > 2400
        )
          throw new Error(`Verifica fallita per ${photo.id}.`);
      } else if (!exists.rows.length) {
        let asset;
        try {
          asset = await sdk.api.resource(publicId, {
            resource_type: "image",
            type: "upload",
          });
        } catch (error) {
          if (
            (error as { error?: { http_code?: number }; http_code?: number })
              .error?.http_code !== 404 &&
            (error as { http_code?: number }).http_code !== 404
          )
            throw error;
          const input = await readFile(
            path.join(process.cwd(), "public", decodeURIComponent(photo.src)),
          );
          const buffer = await sharp(input)
            .rotate()
            .resize({
              width: 2400,
              height: 2400,
              fit: "inside",
              withoutEnlargement: true,
            })
            .flatten({ background: "#fff" })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
          asset = await new Promise<import("cloudinary").UploadApiResponse>(
            (resolve, reject) => {
              const stream = sdk.uploader.upload_stream(
                {
                  public_id: publicId,
                  resource_type: "image",
                  overwrite: false,
                },
                (error, result) =>
                  error || !result
                    ? reject(error ?? new Error("Upload non riuscito"))
                    : resolve(result),
              );
              stream.end(buffer);
            },
          );
        }
        await db().execute({
          sql: "INSERT INTO photos (id, category_id, src, public_id, alt, width, height, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            photo.id,
            category.id,
            asset.secure_url,
            publicId,
            photo.alt,
            asset.width,
            asset.height,
            photo.position,
          ],
        });
      }
      console.log(`${verify ? "Verificata" : "Importata"}: ${photo.id}`);
    }
    if (!verify)
      await db().execute({
        sql: "UPDATE categories SET cover_id = ? WHERE id = ? AND cover_id IS NULL",
        args: [category.coverId, category.id],
      });
  }
  if (!verify)
    await db().execute({
      sql: "INSERT OR REPLACE INTO migrations (id, completed_at) VALUES ('original-portfolio-v1', ?)",
      args: [Date.now()],
    });
  console.log(
    verify
      ? "Verifica remota completata: tutte le foto originali sono nel database e su Cloudinary."
      : "Importazione completata. Esegui npm run portfolio:verify prima di rimuovere i file locali. Se il sito è già online, aggiorna la cache dall'admin o attendi 5 minuti.",
  );
}
main().catch(() => {
  console.error(
    "Importazione/verifica interrotta. Controlla configurazione, connettività e quote dei servizi. Lo script può essere rieseguito senza duplicare le foto.",
  );
  process.exitCode = 1;
});
