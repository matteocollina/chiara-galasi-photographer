export type Photo = {
  id: string;
  categoryId: string;
  src: string;
  publicId: string;
  alt: string;
  width: number;
  height: number;
  position: number;
};
export type Category = {
  id: string;
  slug: string;
  name: string;
  title: string;
  intro: string;
  coverId: string | null;
  position: number;
  masonry: boolean;
  images: Photo[];
};
export type AdminState = { categories: Category[]; cleanupCount: number };
