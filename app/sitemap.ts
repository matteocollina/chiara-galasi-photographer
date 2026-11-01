export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/server/public-catalog";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://chiaragalasi.it";
  const categories = await getCatalog();
  return [
    ...["", "/chi-sono", "/contatti", "/faq"].map((path) => ({
      url: `${base}${path}`,
      priority: path ? 0.7 : 1,
    })),
    ...categories
      .filter((category) => category.images.length)
      .map((category) => ({ url: `${base}/${category.slug}`, priority: 0.8 })),
  ];
}
