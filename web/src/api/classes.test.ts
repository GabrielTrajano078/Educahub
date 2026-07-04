import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api-client";
import { listClassrooms } from "./classes";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("listClassrooms", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("valida resposta com normalizedName", async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {
        _id: "c1",
        schoolId: "s1",
        name: "5A Manha",
        normalizedName: "5A MANHA",
        grade: "5",
      },
    ]);

    const rows = await listClassrooms();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/classes");
    expect(rows[0]?.normalizedName).toBe("5A MANHA");
  });

  it("rejeita payload invalido da API", async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {
        _id: "c1",
        schoolId: "s1",
        name: "5A Manha",
        grade: "5",
      },
    ]);

    await expect(listClassrooms()).rejects.toThrow();
  });
});
