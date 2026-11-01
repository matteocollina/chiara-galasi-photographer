import "server-only";
import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;
let initialization: Promise<void> | undefined;
export const hasDatabase = () => Boolean(process.env.STORAGE_TURSO_DATABASE_URL);
export function db() {
  const url = process.env.STORAGE_TURSO_DATABASE_URL;
  if (!url) throw new Error("Database non configurato.");
  if (process.env.VERCEL && url.startsWith("file:"))
    throw new Error("Su Vercel è necessario un database Turso remoto.");
  return (client ??= createClient({
    url,
    authToken: process.env.STORAGE_TURSO_AUTH_TOKEN,
  }));
}
export const schema = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, title TEXT NOT NULL,
    intro TEXT NOT NULL DEFAULT '', cover_id TEXT, position INTEGER NOT NULL DEFAULT 0,
    masonry INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    src TEXT NOT NULL, public_id TEXT NOT NULL UNIQUE, alt TEXT NOT NULL,
    width INTEGER NOT NULL, height INTEGER NOT NULL, position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS photos_category ON photos(category_id, position)`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS upload_intents (
    id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, category_id TEXT NOT NULL REFERENCES categories(id),
    session_id TEXT NOT NULL, expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cleanup_jobs (
    public_id TEXT PRIMARY KEY, available_after INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, completed_at INTEGER NOT NULL)`,
];
export async function ensureSchema() {
  if (!initialization) {
    initialization = db()
      .batch(schema, "write")
      .then(() => {})
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }
  return initialization;
}
