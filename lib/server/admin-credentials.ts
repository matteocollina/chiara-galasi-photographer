import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
export const ADMIN_USERNAME = "chiara-7bed02";
const SALT = "8bd86e4c9f0f4de410abaf143018c2f9";
const PASSWORD_HASH = "afaa5c40349104653ddaec41f9b9846daced3908189e08060c5b810535622942f6b79f464573d4b327f58c1c125c595887ae678dfaafe07f053881fabd8211de";
export function checkCredentials(username: string, password: string) {
  const supplied = scryptSync(password, SALT, 64);
  const validPassword = timingSafeEqual(supplied, Buffer.from(PASSWORD_HASH, "hex"));
  return username === ADMIN_USERNAME && validPassword;
}
