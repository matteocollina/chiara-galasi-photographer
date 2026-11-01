import { MAX_EDGE, MAX_INPUT_BYTES, MAX_WEB_BYTES } from "./validation";
export async function preparePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Usa fotografie JPEG, PNG o WebP.");
  if (!file.size || file.size > MAX_INPUT_BYTES)
    throw new Error("Ogni file deve pesare al massimo 20 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!jpeg && !png && !webp)
    throw new Error("Il contenuto del file non è un’immagine supportata.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (bitmap.width * bitmap.height > 80_000_000)
      throw new Error("La foto supera il limite di 80 megapixel.");
    const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Il browser non supporta la preparazione delle foto.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Impossibile convertire la foto.")),
        "image/jpeg",
        0.85,
      ),
    );
    if (blob.size > MAX_WEB_BYTES)
      throw new Error(
        "La versione ottimizzata è troppo grande. Riduci la foto e riprova.",
      );
    return blob;
  } finally {
    bitmap.close();
  }
}
