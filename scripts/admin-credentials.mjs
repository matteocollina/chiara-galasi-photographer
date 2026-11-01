import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";
const username = `chiara-${randomBytes(3).toString("hex")}`;
const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
writeFileSync(
  "lib/server/admin-credentials.ts",
  `import "server-only";\nimport { scryptSync, timingSafeEqual } from "node:crypto";\nexport const ADMIN_USERNAME = ${JSON.stringify(username)};\nconst SALT = ${JSON.stringify(salt)};\nconst PASSWORD_HASH = ${JSON.stringify(hash)};\nexport function checkCredentials(username: string, password: string) {\n  const supplied = scryptSync(password, SALT, 64);\n  const validPassword = timingSafeEqual(supplied, Buffer.from(PASSWORD_HASH, "hex"));\n  return username === ADMIN_USERNAME && validPassword;\n}\n`,
);
writeFileSync(
  ".admin-credentials.local",
  `Username: ${username}\nPassword: ${password}\n`,
  { mode: 0o600 },
);
console.log(
  "Credenziali rigenerate in .admin-credentials.local (non versionato). Cambia anche ADMIN_SESSION_SECRET per revocare tutte le sessioni, poi esegui il deploy.",
);
