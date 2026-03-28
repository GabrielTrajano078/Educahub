import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getStoredToken, setStoredToken } from "./api-client";

describe("token storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("persiste e lê o token", () => {
    setStoredToken("abc");
    expect(getStoredToken()).toBe("abc");
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("envia Authorization quando há token", async () => {
    setStoredToken("tok");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"ok":true}'),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch<{ ok: boolean }>("/api/health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok");
  });

  it("lança ApiError com mensagem do servidor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: "Credenciais invalidas." })),
      }),
    );

    await expect(apiFetch("/api/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Credenciais invalidas.",
    });
  });

  it("aceita corpo vazio 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(""),
      }),
    );

    const result = await apiFetch<null>("/x");
    expect(result).toBeNull();
  });
});

describe("ApiError", () => {
  it("expõe status e payload", () => {
    const err = new ApiError(400, "bad", { issues: [] });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.payload).toEqual({ issues: [] });
  });
});
