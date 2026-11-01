"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminState, Category } from "@/lib/types";
import type { Mutation } from "@/lib/validation";
import { adminRequest } from "./api-client";
import { UploadPanel } from "./upload-panel";

function categorySlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function reordered(ids: string[], index: number, direction: number) {
  const copy = [...ids];
  [copy[index], copy[index + direction]] = [
    copy[index + direction],
    copy[index],
  ];
  return copy;
}
function CategoryForm({
  category,
  busy,
  onSave,
}: {
  category?: Category;
  busy: boolean;
  onSave: (input: Mutation) => Promise<boolean>;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const suggestedSlug = categorySlug(name);
  return (
    <form
      className="admin-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const fields = {
          name: String(data.get("name")),
          title: String(data.get("title")),
          intro: String(data.get("intro")),
          masonry: data.get("masonry") === "on",
        };
        const success = await onSave(
          category
            ? { action: "updateCategory", id: category.id, ...fields }
            : {
                action: "createCategory",
                slug: String(data.get("slug")),
                ...fields,
              },
        );
        if (success && !category) {
          form.reset();
          setName("");
          setCustomSlug(null);
        }
      }}
    >
      <h3>{category ? "Dettagli categoria" : "Nuova categoria"}</h3>
      <fieldset disabled={busy}>
        <label>
          Nome nella home
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </label>
        <label>
          Titolo della galleria
          <input
            name="title"
            defaultValue={category?.title ?? ""}
            maxLength={180}
            required
          />
        </label>
        {category ? (
          <p>
            Indirizzo:{" "}
            <a
              href={`/${category.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              /{category.slug}
            </a>
          </p>
        ) : (
          <label>
            Indirizzo (es. matrimoni)
            <input
              name="slug"
              value={customSlug ?? suggestedSlug}
              onChange={(event) =>
                setCustomSlug(
                  event.target.value === suggestedSlug
                    ? null
                    : event.target.value,
                )
              }
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={80}
              required
            />
            <small>
              Generato dal nome. Puoi modificarlo prima della creazione; poi
              resterà fisso.
            </small>
          </label>
        )}
        <label>
          Descrizione
          <textarea
            name="intro"
            defaultValue={category?.intro ?? ""}
            maxLength={5000}
            rows={5}
          />
        </label>
        <label className="admin-check">
          <input
            name="masonry"
            type="checkbox"
            defaultChecked={category?.masonry ?? true}
          />{" "}
          Galleria a colonne con altezze variabili
        </label>
        <button>{category ? "Salva modifiche" : "Crea categoria"}</button>
      </fieldset>
    </form>
  );
}
export function Dashboard({ initial }: { initial: AdminState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<string | null>(
    initial.categories[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [working, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const busy = working || uploadBusy;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const category = state.categories.find((row) => row.id === selected);
  async function refresh() {
    const next = await adminRequest<AdminState>("state");
    setState(next);
    setSelected((current) =>
      next.categories.some((row) => row.id === current)
        ? current
        : (next.categories[0]?.id ?? null),
    );
  }
  async function mutate(input: Mutation) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await adminRequest("mutate", input);
      await refresh();
      setMessage("Modifiche salvate.");
      if (input.action === "createCategory") {
        const next = await adminRequest<AdminState>("state");
        setState(next);
        setSelected(
          next.categories.find((row) => row.slug === input.slug)?.id ?? null,
        );
        setCreating(false);
      }
      if (input.action === "deleteCategory") setCreating(false);
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Operazione non riuscita.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-dashboard">
      <div className="admin-row">
        <div>
          <p className="admin-eyebrow">Area riservata</p>
          <h2>Il tuo portfolio</h2>
        </div>
        <button
          className="admin-secondary"
          disabled={busy}
          onClick={async () => {
            try {
              await adminRequest("logout", {});
              router.replace("/admin");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Uscita non riuscita.");
            }
          }}
        >
          Esci
        </button>
      </div>
      <div aria-live="polite">
        {message && <p className="admin-success">{message}</p>}
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
      </div>
      {state.cleanupCount > 0 && (
        <div className="admin-notice">
          <p>
            {state.cleanupCount} immagini da rimuovere dallo storage. Le foto
            eliminate sono già nascoste dal sito.
          </p>
          <button
            disabled={busy}
            onClick={() => void mutate({ action: "retryCleanup" })}
          >
            Riprova pulizia
          </button>
        </div>
      )}
      <div className="admin-columns">
        <aside className="admin-card">
          <div className="admin-row">
            <h3>Categorie</h3>
            <button disabled={busy} onClick={() => setCreating(true)}>
              + Nuova
            </button>
          </div>
          <p>Le categorie vuote non compaiono nella home.</p>
          <ul className="admin-category-list">
            {state.categories.map((row, index) => (
              <li key={row.id}>
                <button
                  className={
                    !creating && selected === row.id
                      ? "admin-selected"
                      : "admin-secondary"
                  }
                  onClick={() => {
                    setSelected(row.id);
                    setCreating(false);
                  }}
                  disabled={busy}
                >
                  {row.name} <small>({row.images.length})</small>
                </button>
                <div className="admin-order">
                  <button
                    disabled={busy || index === 0}
                    aria-label={`Sposta ${row.name} su`}
                    onClick={() =>
                      void mutate({
                        action: "reorderCategories",
                        ids: reordered(
                          state.categories.map((c) => c.id),
                          index,
                          -1,
                        ),
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    disabled={busy || index === state.categories.length - 1}
                    aria-label={`Sposta ${row.name} giù`}
                    onClick={() =>
                      void mutate({
                        action: "reorderCategories",
                        ids: reordered(
                          state.categories.map((c) => c.id),
                          index,
                          1,
                        ),
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <div className="admin-content">
          {creating || !category ? (
            <CategoryForm key="new" busy={busy} onSave={mutate} />
          ) : (
            <>
              <CategoryForm
                key={category.id}
                category={category}
                busy={busy}
                onSave={mutate}
              />
              <UploadPanel
                key={`upload-${category.id}`}
                categoryId={category.id}
                onSaved={refresh}
                onBusyChange={setUploadBusy}
              />
              <section className="admin-card">
                <h3>Fotografie ({category.images.length})</h3>
                <div className="admin-photo-grid">
                  {category.images.map((photo, index) => (
                    <article className="admin-photo" key={photo.id}>
                      <Image
                        unoptimized={photo.src.startsWith("/")}
                        src={photo.src}
                        width={photo.width}
                        height={photo.height}
                        alt={photo.alt}
                        sizes="(max-width: 600px) 100vw, 300px"
                      />
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const data = new FormData(event.currentTarget);
                          void mutate({
                            action: "updatePhoto",
                            id: photo.id,
                            alt: String(data.get("alt")),
                          });
                        }}
                      >
                        <label>
                          Descrizione
                          <input
                            name="alt"
                            defaultValue={photo.alt}
                            required
                            maxLength={300}
                            disabled={busy}
                          />
                        </label>
                        <button disabled={busy} className="admin-secondary">
                          Salva descrizione
                        </button>
                      </form>
                      <div className="admin-photo-actions">
                        <button
                          disabled={busy || category.coverId === photo.id}
                          onClick={() =>
                            void mutate({
                              action: "setCover",
                              id: category.id,
                              photoId: photo.id,
                            })
                          }
                        >
                          {category.coverId === photo.id
                            ? "✓ Copertina"
                            : "Usa come copertina"}
                        </button>
                        <div className="admin-order">
                          <button
                            disabled={busy || index === 0}
                            aria-label={`Sposta foto ${index + 1} prima`}
                            onClick={() =>
                              void mutate({
                                action: "reorderPhotos",
                                categoryId: category.id,
                                ids: reordered(
                                  category.images.map((p) => p.id),
                                  index,
                                  -1,
                                ),
                              })
                            }
                          >
                            ↑
                          </button>
                          <button
                            disabled={
                              busy || index === category.images.length - 1
                            }
                            aria-label={`Sposta foto ${index + 1} dopo`}
                            onClick={() =>
                              void mutate({
                                action: "reorderPhotos",
                                categoryId: category.id,
                                ids: reordered(
                                  category.images.map((p) => p.id),
                                  index,
                                  1,
                                ),
                              })
                            }
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          className="admin-danger"
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                "Eliminare definitivamente questa fotografia?",
                              )
                            )
                              void mutate({
                                action: "deletePhoto",
                                id: photo.id,
                              });
                          }}
                        >
                          Elimina foto
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!category.images.length && (
                  <p>
                    Questa categoria è vuota. Carica le prime fotografie per
                    pubblicarla.
                  </p>
                )}
              </section>
              <section className="admin-card">
                <button
                  className="admin-danger"
                  disabled={busy || category.images.length > 0}
                  onClick={() => {
                    if (confirm(`Eliminare la categoria “${category.name}”?`))
                      void mutate({
                        action: "deleteCategory",
                        id: category.id,
                      });
                  }}
                >
                  Elimina categoria
                </button>
                {category.images.length > 0 && (
                  <p>
                    Per eliminare la categoria, rimuovi prima tutte le foto.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
