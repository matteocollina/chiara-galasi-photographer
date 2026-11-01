export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCatalog } from "@/lib/server/public-catalog";
export const metadata: Metadata = {
  title: "Chiara Galasi Photographer | Sito Web ufficiale",
  description: "Sito ufficiale di Chiara Galasi, appassionata di fotografia.",
  alternates: { canonical: "/" },
};
export default async function Page() {
  const categories = (await getCatalog()).filter(
    (category) => category.images.length,
  );
  return (
    <div className="container-fluid">
      <div className="row">
        {categories.map((category, index) => {
          const cover =
            category.images.find((photo) => photo.id === category.coverId) ??
            category.images[0];
          return (
            <div className="col-lg-4" key={category.id}>
              <div className="image-wrap-2">
                <div className="image-info">
                  <h2 className="mb-3">{category.name}</h2>
                  <Link
                    href={`/${category.slug}`}
                    className="btn btn-outline-white py-2 px-4"
                  >
                    More Photos
                  </Link>
                </div>
                <Image
                  unoptimized={cover.src.startsWith("/")}
                  src={cover.src}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  className="img-fluid"
                  sizes="(max-width: 991px) 100vw, 33vw"
                  preload={index === 0}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
