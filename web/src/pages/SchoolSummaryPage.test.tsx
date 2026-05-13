import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listSchools } from "@/api/schools";
import { fetchSchoolSummary } from "@/api/results";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { renderPage } from "@/test/render-page";
import { SchoolSummaryPage } from "./SchoolSummaryPage";

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/api/schools", () => ({
  listSchools: vi.fn(),
}));

vi.mock("@/api/results", () => ({
  fetchSchoolSummary: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedListSchools = vi.mocked(listSchools);
const mockedFetchSchoolSummary = vi.mocked(fetchSchoolSummary);

const adminAuth = {
  state: {
    status: "authenticated" as const,
    user: {
      id: "admin-1",
      fullName: "Admin",
      email: "admin@example.com",
      role: "admin" as const,
      schoolId: null,
      municipalityCode: null,
      classroomIds: [],
    },
  },
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

describe("SchoolSummaryPage", () => {
  it("não renderiza quando usuário não está autenticado", () => {
    mockedUseAuth.mockReturnValue({
      state: { status: "anonymous" },
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { container } = renderPage(<SchoolSummaryPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("admin com escola selecionada exibe resumo das turmas", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockResolvedValueOnce([
      { _id: "507f1f77bcf86cd799439011", name: "EMEF Centro" },
    ]);
    mockedFetchSchoolSummary.mockResolvedValueOnce({
      schoolId: "507f1f77bcf86cd799439011",
      classrooms: [
        {
          classroomId: "507f1f77bcf86cd799439012",
          name: "5º A",
          grade: "5",
          descriptorCount: 3,
          meanAccuracyAcrossDescriptors: 72,
          byDescriptor: [],
        },
      ],
    });

    renderPage(<SchoolSummaryPage />, {
      initialEntries: ["/escola/resumo?schoolId=507f1f77bcf86cd799439011"],
    });

    expect(await screen.findByRole("heading", { name: "Resumo da escola" })).toBeInTheDocument();
    expect(await screen.findByText("5º A")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Painel turma" })).toHaveAttribute("href", "/turma/507f1f77bcf86cd799439012");
  });

  it("admin sem escola selecionada pede seleção", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockResolvedValueOnce([]);

    renderPage(<SchoolSummaryPage />);

    expect(await screen.findByText("Selecione uma escola.")).toBeInTheDocument();
  });

  it("coordenador usa escola vinculada ao perfil", async () => {
    mockedUseAuth.mockReturnValue({
      ...adminAuth,
      state: {
        status: "authenticated",
        user: {
          ...adminAuth.state.user,
          role: "coordenador",
          schoolId: "507f1f77bcf86cd799439011",
        },
      },
    });
    mockedFetchSchoolSummary.mockResolvedValueOnce({
      schoolId: "507f1f77bcf86cd799439011",
      classrooms: [],
    });

    renderPage(<SchoolSummaryPage />);

    expect(await screen.findByText("Escola vinculada ao seu usuário.")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedFetchSchoolSummary).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    });
  });

  it("mostra erro ao carregar resumo", async () => {
    mockedUseAuth.mockReturnValue({
      ...adminAuth,
      state: {
        status: "authenticated",
        user: {
          ...adminAuth.state.user,
          role: "coordenador",
          schoolId: "507f1f77bcf86cd799439011",
        },
      },
    });
    mockedFetchSchoolSummary.mockRejectedValueOnce(new ApiError(500, "Falha no resumo.", null));

    renderPage(<SchoolSummaryPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha no resumo.");
  });
});
