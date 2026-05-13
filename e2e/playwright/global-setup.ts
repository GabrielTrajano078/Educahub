/**
 * Smoke HTTP pós-stack: GET /health via proxy do Vite (requer backend em 3001 em dev).
 * Defina E2E_SKIP_API_SMOKE=1 para pular (somente UI).
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_SKIP_API_SMOKE === "1") {
    return;
  }
  const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173"; // mesmo default que playwright.config
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(new URL("/health", base), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`GET /health retornou HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(t);
  }
}
