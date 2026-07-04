import fs from "node:fs";
import path from "node:path";
import { AUTH_STORAGE_PATH } from "./fixtures/e2e-auth.constants";
import { resolveE2eCredentials, writeE2eCredentials } from "./fixtures/e2e-auth";

/**
 * Smoke HTTP pós-stack: GET /health via proxy do Vite (requer backend em 3001 em dev).
 * Garante admin E2E via bootstrap ou credenciais compatíveis com seed local.
 * Defina E2E_SKIP_API_SMOKE=1 para pular (somente UI).
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_SKIP_API_SMOKE === "1") {
    return;
  }

  const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);

  try {
    const health = await fetch(new URL("/health", base), { signal: controller.signal });
    if (!health.ok) {
      throw new Error(`GET /health retornou HTTP ${health.status}`);
    }

    const creds = await resolveE2eCredentials(base);
    writeE2eCredentials(creds);
    fs.mkdirSync(path.dirname(AUTH_STORAGE_PATH), { recursive: true });
  } finally {
    clearTimeout(t);
  }
}
