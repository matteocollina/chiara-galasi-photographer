import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("ADMIN_SESSION_SECRET deve contenere almeno 32 caratteri.");
  return secret;
}
export function signSession(id: string) {
  return `${id}.${createHmac("sha256", sessionSecret()).update(id).digest("base64url")}`;
}
export function verifySession(value: string | undefined) {
  if (!value || value.length > 200) return null;
  const [id, signature, extra] = value.split(".");
  if (!id || !signature || extra || !/^[a-f0-9]{64}$/.test(id)) return null;
  const expected = signSession(id).split(".")[1];
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}
