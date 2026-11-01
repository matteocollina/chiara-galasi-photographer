"use client";
import { useRef, useState } from "react";
import { preparePhoto } from "@/lib/prepare-photo";
import { adminRequest } from "./api-client";

type Upload = {
  id: string;
  file: File;
  alt: string;
  progress: number;
  status: "ready" | "preparing" | "uploading" | "saving" | "done" | "error";
  error?: string;
  uploadId?: string;
  uploaded?: boolean;
};
type Signature = {
  uploadId: string;
  cloudName: string;
  apiKey: string;
  signature: string;
  params: Record<string, string | number | boolean>;
};
function sendImage(
  blob: Blob,
  signature: Signature,
  progress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const data = new FormData();
    data.append("file", blob, "photo.jpg");
    data.append("api_key", signature.apiKey);
    data.append("signature", signature.signature);
    for (const [key, value] of Object.entries(signature.params))
      data.append(key, String(value));
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    );
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Connessione interrotta durante il caricamento."));
    xhr.ontimeout = () =>
      reject(new Error("Caricamento troppo lento. Riprova."));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(
              "Cloudinary ha rifiutato il caricamento. Verifica connessione, formato e quota disponibile.",
            ),
          );
    xhr.send(data);
  });
}
const labels = {
  ready: "In attesa",
  preparing: "Ottimizzazione",
  uploading: "Caricamento",
  saving: "Verifica e salvataggio",
  done: "Pubblicata",
  error: "Da riprovare",
};
export function UploadPanel({
  categoryId,
  onSaved,
  onBusyChange,
}: {
  categoryId: string;
  onSaved: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const lock = useRef(false);
  const patch = (id: string, values: Partial<Upload>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...values } : item)),
    );
  async function upload() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusyChange(true);
    setRefreshError("");
    let saved = false;
    try {
      for (const item of items.filter((item) => item.status !== "done")) {
        let uploaded = item.uploaded;
        let uploadId = item.uploadId;
        try {
          if (!item.alt.trim())
            throw new Error("Aggiungi una descrizione della foto.");
          if (!uploaded || !uploadId) {
            patch(item.id, {
              status: "preparing",
              error: undefined,
              progress: 0,
            });
            const blob = await preparePhoto(item.file);
            const signed = await adminRequest<Signature>("uploads/sign", {
              categoryId,
            });
            uploadId = signed.uploadId;
            patch(item.id, { status: "uploading", uploadId });
            await sendImage(blob, signed, (progress) =>
              patch(item.id, { progress }),
            );
            uploaded = true;
            patch(item.id, { uploaded: true });
          }
          patch(item.id, { status: "saving" });
          await adminRequest("uploads/complete", { uploadId, alt: item.alt });
          patch(item.id, { status: "done", progress: 100, error: undefined });
          saved = true;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Caricamento non riuscito.";
          patch(item.id, {
            status: "error",
            error: message,
            uploaded: message.includes("scaduto") ? false : uploaded,
            uploadId,
          });
        }
      }
      if (saved) {
        try {
          await onSaved();
        } catch {
          setRefreshError(
            "Le foto sono salvate, ma l’elenco non si è aggiornato. Ricarica la pagina.",
          );
        }
      }
    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <section className="admin-card">
      <h3>Aggiungi fotografie</h3>
      <p>
        JPEG, PNG o WebP, massimo 20 MB ciascuna. Conserveremo soltanto la
        versione web, fino a 2400 px.
      </p>
      <label className="admin-file">
        Scegli foto
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            setItems((current) => [
              ...current,
              ...files.map((file) => ({
                id: crypto.randomUUID(),
                file,
                alt: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
                progress: 0,
                status: "ready" as const,
              })),
            ]);
            event.currentTarget.value = "";
          }}
        />
      </label>
      <ul className="admin-upload-list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="admin-row">
              <strong>{item.file.name}</strong>
              <span>
                {labels[item.status]}
                {item.status === "uploading" ? ` ${item.progress}%` : ""}
              </span>
            </div>
            <label>
              Descrizione per accessibilità
              <input
                value={item.alt}
                maxLength={300}
                disabled={busy || item.status === "done"}
                onChange={(event) =>
                  patch(item.id, { alt: event.target.value })
                }
              />
            </label>
            {item.status === "uploading" && (
              <progress
                value={item.progress}
                max={100}
                aria-label={`Caricamento ${item.file.name}`}
              />
            )}
            {item.error && (
              <p role="alert" className="admin-error">
                {item.error}
              </p>
            )}
            {!busy && (
              <button
                className="admin-secondary"
                onClick={() =>
                  setItems((current) =>
                    current.filter((row) => row.id !== item.id),
                  )
                }
              >
                Rimuovi dall’elenco
              </button>
            )}
          </li>
        ))}
      </ul>
      {items.some((item) => item.status !== "done") && (
        <button
          disabled={busy}
          onClick={() => {
            void upload().catch(() => {});
          }}
        >
          {busy
            ? "Caricamento in corso…"
            : items.some((item) => item.status === "error")
              ? "Carica / riprova foto"
              : "Carica foto"}
        </button>
      )}
      {refreshError && (
        <p role="alert" className="admin-error">
          {refreshError}
        </p>
      )}
      <span className="admin-sr-only" aria-live="polite">
        {items.filter((item) => item.status === "done").length} foto pubblicate
      </span>
    </section>
  );
}
