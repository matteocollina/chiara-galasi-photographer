import type { Metadata } from "next";
import { getSession } from "@/lib/server/auth";
import { readCatalog } from "@/lib/server/catalog";
import { cleanupCount } from "@/lib/server/uploads";
import { Dashboard } from "./dashboard";
import { LoginForm } from "./login-form";
import "./admin.css";

export const metadata: Metadata = {
  title: "Gestione portfolio | Chiara Galasi",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const required = [
    "STORAGE_TURSO_DATABASE_URL",
    "ADMIN_SESSION_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (
    process.env.STORAGE_TURSO_DATABASE_URL &&
    !process.env.STORAGE_TURSO_DATABASE_URL.startsWith("file:") &&
    !process.env.STORAGE_TURSO_AUTH_TOKEN
  )
    missing.push("STORAGE_TURSO_AUTH_TOKEN");
  if (
    process.env.ADMIN_SESSION_SECRET &&
    process.env.ADMIN_SESSION_SECRET.length < 32
  )
    missing.push("ADMIN_SESSION_SECRET (almeno 32 caratteri)");
  if (missing.length)
    return (
      <div className="admin-shell">
        <div className="admin-notice">
          <h2>Configurazione da completare</h2>
          <p>
            Il sito pubblico resta consultabile. Per attivare la gestione
            configura sul server:
          </p>
          <ul>
            {missing.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
          <p>Le istruzioni si trovano nel README del progetto.</p>
        </div>
        <LoginForm disabled />
      </div>
    );
  let initial: import("@/lib/types").AdminState | null = null;
  let failed = false;
  try {
    const session = await getSession();
    if (session)
      initial = {
        categories: await readCatalog(),
        cleanupCount: await cleanupCount(),
      };
  } catch {
    failed = true;
  }
  if (failed)
    return (
      <div className="admin-shell">
        <div className="admin-notice">
          <h2>Servizio temporaneamente non disponibile</h2>
          <p>
            Controlla la configurazione e le quote del database, poi ricarica la
            pagina.
          </p>
        </div>
      </div>
    );
  return (
    <div className="admin-shell">
      {initial ? (
        <Dashboard initial={initial} />
      ) : (
        <LoginForm disabled={false} />
      )}
    </div>
  );
}
