import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl } from "./api-base";

describe("getApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna string vazia quando a variável não está definida", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(getApiBaseUrl()).toBe("");
  });

  it("remove barra final", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.exemplo.com/");
    expect(getApiBaseUrl()).toBe("https://api.exemplo.com");
  });
});
