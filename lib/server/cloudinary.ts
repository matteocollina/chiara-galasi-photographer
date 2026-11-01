import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { MAX_EDGE, MAX_WEB_BYTES } from "@/lib/validation";
import { HttpError } from "./http";

export function cloud() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret)
    throw new HttpError(503, "Cloudinary non configurato.");
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
    timeout: 20_000,
  });
  return cloudinary;
}
export function uploadParameters(publicId: string) {
  const sdk = cloud();
  const params = {
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
    overwrite: false,
    allowed_formats: "jpg",
    transformation: `c_limit,w_${MAX_EDGE},h_${MAX_EDGE}/q_85/fl_strip_profile`,
  };
  return {
    params,
    signature: sdk.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!,
    ),
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}
export type VerifiedAsset = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  resource_type: string;
  type: string;
};
export function validateAsset(asset: VerifiedAsset, publicId: string) {
  const url = new URL(asset.secure_url);
  if (
    asset.public_id !== publicId ||
    asset.resource_type !== "image" ||
    asset.type !== "upload" ||
    asset.format !== "jpg" ||
    !Number.isInteger(asset.width) ||
    !Number.isInteger(asset.height) ||
    asset.width < 1 ||
    asset.height < 1 ||
    asset.width > MAX_EDGE ||
    asset.height > MAX_EDGE ||
    asset.bytes <= 0 ||
    asset.bytes > MAX_WEB_BYTES ||
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(
      `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`,
    )
  ) {
    throw new HttpError(
      400,
      "La foto caricata non rispetta i limiti previsti.",
    );
  }
  return asset;
}
