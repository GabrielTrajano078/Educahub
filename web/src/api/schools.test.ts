import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api-client";
import { createSchool, listSchools } from "./schools";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("listSchools", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca sem query quando filtro vazio", async () => {
    mockedApiFetch.mockResolvedValueOnce([{ _id: "s1", name: "EMEF Centro" }]);

    const rows = await listSchools();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/schools");
    expect(rows).toEqual([{ _id: "s1", name: "EMEF Centro" }]);
  });

  it("envia nameContains na query string", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    await listSchools({ nameContains: "  emef  " });

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/schools?nameContains=emef");
  });

  it("rejeita payload invalido da API", async () => {
    mockedApiFetch.mockResolvedValueOnce([{ name: "sem id" }]);

    await expect(listSchools()).rejects.toThrow();
  });
});

describe("createSchool", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia POST com corpo da escola", async () => {
    mockedApiFetch.mockResolvedValueOnce({ id: "s1" });

    const result = await createSchool({
      name: "EMEF Centro",
      city: "Fortaleza",
      municipalityCode: "2304400",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/schools", {
      method: "POST",
      body: {
        name: "EMEF Centro",
        city: "Fortaleza",
        municipalityCode: "2304400",
      },
    });
    expect(result).toEqual({ id: "s1" });
  });
});
