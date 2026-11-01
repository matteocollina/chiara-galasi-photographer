import "./environment";
import { ensureSchema } from "../lib/server/db";
ensureSchema()
  .then(() => console.log("Schema database inizializzato."))
  .catch(() => {
    console.error("Inizializzazione fallita. Verifica le variabili Turso.");
    process.exitCode = 1;
  });
