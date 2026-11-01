"use client";
import type { ImageLoaderProps } from "next/image";
export default function imageLoader({ src, width }: ImageLoaderProps) {
  if (!src.startsWith("https://res.cloudinary.com/")) return src;
  // Four responsive widths limit the number of stored Cloudinary derivatives.
  const size = [480, 960, 1600, 2400].find((size) => size >= width) ?? 2400;
  return src.replace(
    "/image/upload/",
    `/image/upload/c_limit,w_${size},f_auto,q_auto/`,
  );
}
