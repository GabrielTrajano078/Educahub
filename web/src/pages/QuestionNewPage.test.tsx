import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createQuestion } from "@/api/questions";
import { QuestionNewModal } from "./QuestionNewPage";

vi.mock("@/api/questions", () => ({
  createQuestion: vi.fn(),
}));

const mockedCreateQuestion = vi.mocked(createQuestion);

function renderModal(onClose = vi.fn(), open = true) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={client}>
      <QuestionNewModal open={open} onClose={onClose} />
    </QueryClientProvider>,
  );

  return onClose;
}

describe("QuestionNewModal", () => {
  it("não renderiza quando fechado", () => {
    renderModal(vi.fn(), false);
    expect(screen.queryByRole("dialog", { name: "Nova questão" })).not.toBeInTheDocument();
  });

  it("não exibe campo de eixo curricular", () => {
    renderModal();
    expect(screen.queryByLabelText("Eixo (opcional)")).not.toBeInTheDocument();
  });

  it("cria questão e fecha após confirmação de sucesso", async () => {
    mockedCreateQuestion.mockResolvedValueOnce({ id: "q1" });
    const onClose = renderModal();

    fireEvent.change(screen.getByLabelText("Descritor / habilidade"), { target: { value: "D1" } });
    fireEvent.change(screen.getByLabelText("Enunciado"), { target: { value: "Enunciado da questão" } });
    fireEvent.change(screen.getByLabelText("Alternativa A"), { target: { value: "Alternativa A" } });
    fireEvent.change(screen.getByLabelText("Alternativa B"), { target: { value: "Alternativa B" } });
    fireEvent.change(screen.getByLabelText("Alternativa C"), { target: { value: "Alternativa C" } });
    fireEvent.change(screen.getByLabelText("Alternativa D"), { target: { value: "Alternativa D" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => {
      expect(mockedCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          descriptor: "D1",
          prompt: "Enunciado da questão",
          optionA: "Alternativa A",
          optionB: "Alternativa B",
          optionC: "Alternativa C",
          optionD: "Alternativa D",
        }),
      );
      expect(mockedCreateQuestion.mock.calls[0]?.[0]).not.toHaveProperty("axis");
    });

    fireEvent.click(await screen.findByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
