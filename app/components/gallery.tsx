"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
};
export function Gallery({
  title,
  intro,
  images,
  masonry = false,
}: {
  title: string;
  intro: string;
  images: Photo[];
  masonry?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const photo = selected === null ? null : images[selected];
  useEffect(() => {
    if (selected !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  function move(delta: number) {
    setSelected((current) =>
      current === null
        ? null
        : (current + delta + images.length) % images.length,
    );
  }
  return (
    <div className="site-section">
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-7">
            <div className="row mb-5">
              <div className="col-12">
                <h2 className="site-section-heading text-center">{title}</h2>
                <h4 className="text-center">{intro}</h4>
              </div>
            </div>
          </div>
        </div>
        {!images.length && (
          <p className="text-center">
            Le fotografie saranno disponibili a breve.
          </p>
        )}
        <div className={masonry ? "photo-masonry" : "row"} id="lightgallery">
          {images.map((image, index) => (
            <div
              key={image.src}
              className={
                masonry ? "photo-masonry-item" : "col-sm-6 col-md-4 item"
              }
            >
              <button
                className="photo-button"
                aria-label={`Apri ${image.alt}`}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setSelected(index);
                }}
              >
                <Image
                  unoptimized={image.src.startsWith("/")}
                  {...image}
                  alt={image.alt}
                  className="img-fluid"
                  sizes="(max-width: 575px) 100vw, (max-width: 767px) 50vw, 33vw"
                />
              </button>
            </div>
          ))}
        </div>
        <dialog
          ref={dialog}
          className="lightbox"
          aria-label={title}
          onCancel={() => setSelected(null)}
          onClose={() => {
            setSelected(null);
            trigger.current?.focus();
          }}
          onClick={(event) => {
            if (event.target === dialog.current) setSelected(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
          }}
        >
          {photo && (
            <>
              <div className="lightbox-toolbar">
                <span aria-live="polite">
                  {(selected ?? 0) + 1} / {images.length}
                </span>
                <a href={photo.src} target="_blank" rel="noopener noreferrer">
                  Apri originale
                </a>
                <button
                  aria-label="Chiudi foto"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </div>
              <button
                className="lightbox-prev"
                aria-label="Foto precedente"
                onClick={() => move(-1)}
              >
                ‹
              </button>
              <Image
                unoptimized={photo.src.startsWith("/")}
                {...photo}
                alt={photo.alt}
                className="lightbox-photo"
                sizes="95vw"
              />
              <button
                className="lightbox-next"
                aria-label="Foto successiva"
                onClick={() => move(1)}
              >
                ›
              </button>
            </>
          )}
        </dialog>
      </div>
    </div>
  );
}
