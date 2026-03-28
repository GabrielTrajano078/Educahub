/**
 * Base URL da API. Em dev, string vazia usa o mesmo origin (proxy do Vite).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? "";
  return raw.replace(/\/$/, "");
}
