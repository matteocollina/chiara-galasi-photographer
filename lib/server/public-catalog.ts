import "server-only";
import { unstable_cache } from "next/cache";
import { readCatalog } from "./catalog";
// Include the database identity so a pre-configuration cache never masks the live catalog.
export const getCatalog = unstable_cache(
  readCatalog,
  ["portfolio-catalog-v1", process.env.STORAGE_TURSO_DATABASE_URL ?? "original-files"],
  { tags: ["portfolio"], revalidate: 300 },
);
