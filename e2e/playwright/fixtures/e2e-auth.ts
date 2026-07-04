import fs from "node:fs";
import path from "node:path";
import { AUTH_STORAGE_PATH, E2E_ADMIN } from "./e2e-auth.constants";

export const E2E_CREDS_PATH = path.join(path.dirname(AUTH_STORAGE_PATH), "e2e-credentials.json");

/** Admin do seed local (`npm run seed`); usado quando o bootstrap E2E já não está disponível. */
export const SEED_ADMIN = {
  fullName: "Administrador",
  email: "admin@saeb.local",
  password: "Admin123",
} as const;

export type E2eCredentials = {
  email: string;
  password: string;
};

export async function tryLogin(base: string, creds: E2eCredentials): Promise<boolean> {
  const res = await fetch(new URL("/api/auth/login", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  return res.ok;
}

export async function resolveE2eCredentials(base: string): Promise<E2eCredentials> {
  const bootstrap = await fetch(new URL("/api/auth/bootstrap-admin", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: E2E_ADMIN.fullName,
      email: E2E_ADMIN.email,
      password: E2E_ADMIN.password,
    }),
  });

  if (bootstrap.status === 201) {
    return { email: E2E_ADMIN.email, password: E2E_ADMIN.password };
  }

  if (bootstrap.status === 409) {
    if (await tryLogin(base, E2E_ADMIN)) {
      return { email: E2E_ADMIN.email, password: E2E_ADMIN.password };
    }
    if (await tryLogin(base, SEED_ADMIN)) {
      return { email: SEED_ADMIN.email, password: SEED_ADMIN.password };
    }
    throw new Error(
      "Banco já inicializado, mas login E2E falhou. Defina E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD ou use Mongo vazio.",
    );
  }

  const body = await bootstrap.text().catch(() => "");
  throw new Error(`POST /api/auth/bootstrap-admin retornou HTTP ${bootstrap.status}: ${body}`);
}

export function writeE2eCredentials(creds: E2eCredentials): void {
  fs.mkdirSync(path.dirname(E2E_CREDS_PATH), { recursive: true });
  fs.writeFileSync(E2E_CREDS_PATH, JSON.stringify(creds, null, 2), "utf-8");
}

export function readE2eCredentials(): E2eCredentials {
  return JSON.parse(fs.readFileSync(E2E_CREDS_PATH, "utf-8")) as E2eCredentials;
}
