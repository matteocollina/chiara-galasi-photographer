export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/server/public-catalog";
import { Gallery } from "@/app/components/gallery";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCatalog()).find((row) => row.slug === slug);
  if (!category) return { title: "Galleria non trovata" };
  const cover =
    category.images.find((photo) => photo.id === category.coverId) ??
    category.images[0];
  return {
    title: `Chiara Galasi Photographer | ${category.title}`,
    description:
      category.intro || `Fotografie di ${category.name} di Chiara Galasi.`,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: category.title,
      description: category.intro,
      images: cover
        ? [
            {
              url: cover.src,
              width: cover.width,
              height: cover.height,
              alt: cover.alt,
            },
          ]
        : [],
    },
  };
}
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = (await getCatalog()).find((row) => row.slug === slug);
  if (!category) notFound();
  return (
    <Gallery
      title={category.title}
      intro={category.intro}
      images={category.images}
      masonry={category.masonry}
    />
  );
}
