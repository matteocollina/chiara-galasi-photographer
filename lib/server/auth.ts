import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, ensureSchema, hasDatabase } from "./db";
import { checkCredentials } from "./admin-credentials";
import { sessionSecret, signSession, verifySession } from "./session-crypto";
import { HttpError } from "./http";

const COOKIE = "chiara_admin";
const TTL = 24 * 60 * 60;
export async function getSession() {
  if (!hasDatabase() || !process.env.ADMIN_SESSION_SECRET) return null;
  const id = verifySession((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  await ensureSchema();
  const result = await db().execute({
    sql: "SELECT id FROM sessions WHERE id = ? AND expires_at > ?",
    args: [id, Date.now()],
  });
  return result.rows.length ? id : null;
}
export async function requireSession() {
  const session = await getSession();
  if (!session)
    throw new HttpError(401, "Sessione scaduta. Accedi nuovamente.");
  return session;
}
export async function login(
  request: Request,
  username: string,
  password: string,
) {
  sessionSecret();
  await ensureSchema();
  // Vercel overwrites x-vercel-forwarded-for; local environments share a conservative bucket.
  const ip = process.env.VERCEL
    ? (request.headers.get("x-vercel-forwarded-for") ?? "unknown")
    : "local";
  const key = createHmac("sha256", sessionSecret()).update(ip).digest("hex");
  const now = Date.now();
  const tx = await db().transaction("write");
  try {
    await tx.execute({
      sql: "DELETE FROM login_attempts WHERE expires_at <= ?",
      args: [now],
    });
    await tx.execute({
      sql: "DELETE FROM sessions WHERE expires_at <= ?",
      args: [now],
    });
    const attempts = await tx.execute({
      sql: "SELECT count FROM login_attempts WHERE key = ?",
      args: [key],
    });
    if (Number(attempts.rows[0]?.count ?? 0) >= 5)
      throw new HttpError(429, "Troppi tentativi. Riprova tra 15 minuti.");
    await tx.execute({
      sql: "INSERT INTO login_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1",
      args: [key, now + 15 * 60_000],
    });
    await tx.commit();
  } finally {
    tx.close();
  }
  if (!checkCredentials(username, password))
    throw new HttpError(401, "Credenziali non valide.");
  const id = randomBytes(32).toString("hex");
  const previous = verifySession((await cookies()).get(COOKIE)?.value);
  await db().batch(
    [
      { sql: "DELETE FROM login_attempts WHERE key = ?", args: [key] },
      { sql: "DELETE FROM sessions WHERE id = ?", args: [previous ?? ""] },
      {
        sql: "INSERT INTO sessions (id, expires_at) VALUES (?, ?)",
        args: [id, now + TTL * 1000],
      },
    ],
    "write",
  );
  (await cookies()).set(COOKIE, signSession(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
}
export async function logout() {
  const id = verifySession((await cookies()).get(COOKIE)?.value);
  if (id) {
    await ensureSchema();
    await db().execute({
      sql: "DELETE FROM sessions WHERE id = ?",
      args: [id],
    });
  }
  (await cookies()).delete(COOKIE);
}
