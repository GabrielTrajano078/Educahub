import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api-client";
import { listStudents } from "./students";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("listStudents", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("valida resposta com normalizedFullName", async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {
        _id: "s1",
        schoolId: "sc1",
        classroomId: "c1",
        fullName: "Ana Clara Sousa",
        normalizedFullName: "ANA CLARA SOUSA",
        registrationCode: "ALU-1",
      },
    ]);

    const rows = await listStudents();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/students");
    expect(rows[0]?.normalizedFullName).toBe("ANA CLARA SOUSA");
  });

  it("rejeita payload invalido da API", async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {
        _id: "s1",
        schoolId: "sc1",
        classroomId: "c1",
        fullName: "Ana",
        registrationCode: "ALU-1",
      },
    ]);

    await expect(listStudents()).rejects.toThrow();
  });
});
