import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deleteExam, listExams } from "@/api/exams";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { renderPage } from "@/test/render-page";
import { ExamsPage } from "./ExamsPage";

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/api/exams", () => ({
  listExams: vi.fn(),
  deleteExam: vi.fn(),
  fetchExam: vi.fn(),
  createExam: vi.fn(),
  updateExam: vi.fn(),
  fetchSimulatedBlueprint: vi.fn(),
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedListExams = vi.mocked(listExams);
const mockedDeleteExam = vi.mocked(deleteExam);

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

const sampleExam = {
  _id: "507f1f77bcf86cd799439011",
  schoolId: "507f1f77bcf86cd799439012",
  classroomId: "507f1f77bcf86cd799439013",
  title: "Diagnóstico LP 5º",
  discipline: "LP" as const,
  grade: "5" as const,
  framework: "SAEB" as const,
  status: "DRAFT",
  questionCount: 10,
};

describe("ExamsPage", () => {
  it("não renderiza quando usuário não está autenticado", () => {
    mockedUseAuth.mockReturnValue({
      state: { status: "anonymous" },
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { container } = renderPage(<ExamsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista provas", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListExams.mockResolvedValueOnce([sampleExam]);

    renderPage(<ExamsPage />);

    expect(await screen.findByRole("heading", { name: "Provas" })).toBeInTheDocument();
    expect(await screen.findByText("Diagnóstico LP 5º")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova prova" })).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há provas", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListExams.mockResolvedValueOnce([]);

    renderPage(<ExamsPage />);

    expect(await screen.findByText("Nenhuma prova encontrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar prova" })).toBeInTheDocument();
  });

  it("mostra erro da API", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListExams.mockRejectedValueOnce(new ApiError(403, "Acesso negado.", null));

    renderPage(<ExamsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado.");
  });

  it("refaz busca ao alterar filtro de descritor", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListExams.mockResolvedValue([]);

    renderPage(<ExamsPage />);

    await waitFor(() => {
      expect(mockedListExams).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Ex.: D3"), {
      target: { value: "D2" },
    });

    await waitFor(() => {
      expect(mockedListExams).toHaveBeenCalledWith({ descriptor: "D2" });
    });
  });

  it("exclui prova após confirmação", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListExams.mockResolvedValueOnce([sampleExam]);
    mockedDeleteExam.mockResolvedValueOnce(undefined);
    mockedListExams.mockResolvedValueOnce([]);

    renderPage(<ExamsPage />);

    fireEvent.click(await screen.findByLabelText("Excluir Diagnóstico LP 5º"));

    await waitFor(() => {
      expect(mockedDeleteExam).toHaveBeenCalledWith(sampleExam._id);
    });

    expect(await screen.findByText("Prova excluída com sucesso.")).toBeInTheDocument();
  });
});
