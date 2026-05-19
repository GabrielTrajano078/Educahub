import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deleteQuestion, listQuestions } from "@/api/questions";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { renderPage } from "@/test/render-page";
import { QuestionsPage } from "./QuestionsPage";

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/api/questions", () => ({
  listQuestions: vi.fn(),
  deleteQuestion: vi.fn(),
  fetchQuestion: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));

vi.mock("@/components/ui/use-confirm", () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedListQuestions = vi.mocked(listQuestions);
const mockedDeleteQuestion = vi.mocked(deleteQuestion);

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

const sampleQuestion = {
  _id: "507f1f77bcf86cd799439011",
  discipline: "LP" as const,
  grade: "5" as const,
  framework: "SAEB" as const,
  descriptor: "D1",
  prompt: "Qual é a alternativa correta?",
  optionA: "A",
  optionB: "B",
  optionC: "C",
  optionD: "D",
};

describe("QuestionsPage", () => {
  it("não renderiza quando usuário não está autenticado", () => {
    mockedUseAuth.mockReturnValue({
      state: { status: "anonymous" },
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { container } = renderPage(<QuestionsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista questões do banco", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListQuestions.mockResolvedValueOnce([sampleQuestion]);

    renderPage(<QuestionsPage />);

    expect(await screen.findByRole("heading", { name: "Banco de questões" })).toBeInTheDocument();
    expect(await screen.findByText("D1")).toBeInTheDocument();
    expect(screen.getByText("Qual é a alternativa correta?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova questão" })).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há questões", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListQuestions.mockResolvedValueOnce([]);

    renderPage(<QuestionsPage />);

    expect(await screen.findByText("Nenhuma questão encontrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar questão" })).toBeInTheDocument();
  });

  it("mostra erro da API", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListQuestions.mockRejectedValueOnce(new ApiError(500, "Erro interno.", null));

    renderPage(<QuestionsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno.");
  });

  it("refaz busca ao alterar filtro de descritor", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListQuestions.mockResolvedValue([]);

    renderPage(<QuestionsPage />);

    await waitFor(() => {
      expect(mockedListQuestions).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Ex.: D3"), {
      target: { value: "D1" },
    });

    await waitFor(() => {
      expect(mockedListQuestions).toHaveBeenCalledWith({ descriptor: "D1" });
    });
  });

  it("professor não vê ações de cadastro e exclusão", async () => {
    mockedUseAuth.mockReturnValue({
      ...adminAuth,
      state: {
        status: "authenticated",
        user: {
          ...adminAuth.state.user,
          role: "professor",
          schoolId: "507f1f77bcf86cd799439012",
        },
      },
    });
    mockedListQuestions.mockResolvedValueOnce([sampleQuestion]);

    renderPage(<QuestionsPage />);

    await screen.findByText("D1");
    expect(screen.queryByRole("button", { name: "Nova questão" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Editar questão D1")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Excluir questão D1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ver questão D1")).toBeInTheDocument();
  });

  it("exclui questão após confirmação", async () => {
    mockedUseAuth.mockReturnValue(adminAuth);
    mockedListQuestions.mockResolvedValueOnce([sampleQuestion]);
    mockedDeleteQuestion.mockResolvedValueOnce(undefined);
    mockedListQuestions.mockResolvedValueOnce([]);

    renderPage(<QuestionsPage />);

    fireEvent.click(await screen.findByLabelText("Excluir questão D1"));

    await waitFor(() => {
      expect(mockedDeleteQuestion).toHaveBeenCalledWith(sampleQuestion._id);
    });

    expect(await screen.findByText("Questão excluída com sucesso.")).toBeInTheDocument();
  });
});
