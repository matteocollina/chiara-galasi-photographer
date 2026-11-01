import { z } from "zod";
export const reservedSlugs = new Set([
  "admin",
  "api",
  "chi-sono",
  "contatti",
  "faq",
  "services",
  "index",
  "images",
  "fonts",
  "_next",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
]);
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(
    (value) => !reservedSlugs.has(value),
    "Questo indirizzo è riservato.",
  );
const id = z.string().min(1).max(120);
const categoryFields = {
  name: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(180),
  intro: z.string().trim().max(5000),
  masonry: z.boolean(),
};
export const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createCategory"),
    slug: slugSchema,
    ...categoryFields,
  }),
  z.object({ action: z.literal("updateCategory"), id, ...categoryFields }),
  z.object({ action: z.literal("deleteCategory"), id }),
  z.object({ action: z.literal("setCover"), id, photoId: id }),
  z.object({
    action: z.literal("updatePhoto"),
    id,
    alt: z.string().trim().min(1).max(300),
  }),
  z.object({ action: z.literal("deletePhoto"), id }),
  z.object({
    action: z.literal("reorderCategories"),
    ids: z.array(id).max(500),
  }),
  z.object({
    action: z.literal("reorderPhotos"),
    categoryId: id,
    ids: z.array(id).max(2000),
  }),
  z.object({ action: z.literal("retryCleanup") }),
]);
export type Mutation = z.infer<typeof mutationSchema>;
export const loginSchema = z.object({
  username: z.string().max(100),
  password: z.string().max(300),
});
export const signSchema = z.object({ categoryId: id });
export const completeSchema = z.object({
  uploadId: id,
  alt: z.string().trim().min(1).max(300),
});
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_WEB_BYTES = 8 * 1024 * 1024;
export const MAX_EDGE = 2400;
export function sameMembers(expected: string[], actual: string[]) {
  return (
    new Set(actual).size === actual.length &&
    expected.length === actual.length &&
    expected.every((value) => actual.includes(value))
  );
}
