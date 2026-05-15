import { screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listClassrooms } from "@/api/classes";
import { listExams } from "@/api/exams";
import { listSchools } from "@/api/schools";
import { fetchClassroomHeatmap, fetchClassroomRanking, fetchClassroomReport, fetchSchoolSummary } from "@/api/results";
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

vi.mock("@/api/classes", () => ({
  listClassrooms: vi.fn(),
}));

vi.mock("@/api/exams", () => ({
  listExams: vi.fn(),
}));

vi.mock("@/api/results", () => ({
  fetchSchoolSummary: vi.fn(),
  fetchClassroomRanking: vi.fn(),
  fetchClassroomHeatmap: vi.fn(),
  fetchClassroomReport: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedListClassrooms = vi.mocked(listClassrooms);
const mockedListExams = vi.mocked(listExams);
const mockedListSchools = vi.mocked(listSchools);
const mockedFetchClassroomHeatmap = vi.mocked(fetchClassroomHeatmap);
const mockedFetchClassroomRanking = vi.mocked(fetchClassroomRanking);
const mockedFetchClassroomReport = vi.mocked(fetchClassroomReport);
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
    mockedListClassrooms.mockResolvedValueOnce([
      {
        _id: "507f1f77bcf86cd799439012",
        schoolId: "507f1f77bcf86cd799439011",
        name: "5º A",
        grade: "5",
      },
    ]);
    mockedListExams.mockResolvedValueOnce([]);
    mockedFetchClassroomRanking.mockResolvedValueOnce([]);
    mockedFetchClassroomHeatmap.mockResolvedValueOnce({
      masteryThreshold: 70,
      weakThreshold: 60,
      dominated: [],
      notDominated: [],
      intermediate: [],
      byDescriptor: [],
    });
    mockedFetchClassroomReport.mockResolvedValueOnce({
      classroom: { id: "507f1f77bcf86cd799439012", name: "5º A", grade: "5", schoolId: "507f1f77bcf86cd799439011" },
      byDescriptor: [],
      byAxis: [],
      masteredDescriptors: [],
      notMasteredDescriptors: [],
      interventions: [],
    });

    renderPage(<SchoolSummaryPage />, {
      initialEntries: ["/escola/resumo?schoolId=507f1f77bcf86cd799439011"],
    });

    expect(await screen.findByRole("heading", { name: "Resumo da escola" })).toBeInTheDocument();
    expect(await screen.findByText("5º A")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    const openButton = screen.getByRole("button", { name: "Abrir painel da turma 5º A" });
    fireEvent.click(openButton);
    expect(await screen.findByRole("heading", { name: "Painel completo da turma" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filtrar por prova" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ranking" })).toBeInTheDocument();
  });

  it("admin sem escola selecionada pede seleção", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListSchools.mockResolvedValueOnce([]);

    renderPage(<SchoolSummaryPage />);
    expect(await screen.findByText("Mostrando todas as turmas com dados disponíveis.")).toBeInTheDocument();
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
