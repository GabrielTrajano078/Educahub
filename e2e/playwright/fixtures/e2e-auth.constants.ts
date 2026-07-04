import path from "node:path";
import { fileURLToPath } from "node:url";

const playwrightDir = path.dirname(fileURLToPath(import.meta.url));

/** Credenciais fixas para E2E (bootstrap + login real). */
export const E2E_ADMIN = {
  fullName: "Administrador E2E",
  email: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@saeb.local",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Admin123456",
} as const;

export const AUTH_STORAGE_PATH = path.join(playwrightDir, "../.auth/admin.json");
