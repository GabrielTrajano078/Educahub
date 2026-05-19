import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api-client";
import {
  createQuestion,
  deleteQuestion,
  fetchQuestion,
  listQuestionDescriptors,
  listQuestions,
  updateQuestion,
} from "./questions";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

const validOid = "507f1f77bcf86cd799439011";

describe("listQuestions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca sem query quando filtro vazio", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    await listQuestions({});

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/questions");
  });

  it("monta query string com filtros", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    await listQuestions({
      discipline: "LP",
      grade: "5",
      framework: "SAEB",
      descriptor: "D1",
      axis: "LEITURA",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/questions?discipline=LP&grade=5&framework=SAEB&descriptor=D1&axis=LEITURA",
    );
  });
});

describe("listQuestionDescriptors", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia disciplina, ano e framework default", async () => {
    mockedApiFetch.mockResolvedValueOnce({ descriptors: ["D1"] });

    const result = await listQuestionDescriptors({ discipline: "MAT", grade: "9" });

    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/questions/descriptors?discipline=MAT&grade=9&framework=SAEB",
    );
    expect(result).toEqual({ descriptors: ["D1"] });
  });
});

describe("fetchQuestion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca questão por id", async () => {
    mockedApiFetch.mockResolvedValueOnce({ _id: validOid, answer: "A" });

    await fetchQuestion(validOid);

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/questions/${validOid}`);
  });
});

describe("createQuestion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia POST com corpo da questão", async () => {
    mockedApiFetch.mockResolvedValueOnce({ id: validOid });

    const body = {
      discipline: "LP" as const,
      grade: "5" as const,
      descriptor: "D1",
      prompt: "Enunciado",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      answer: "A" as const,
    };

    const result = await createQuestion(body);

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/questions", {
      method: "POST",
      body,
    });
    expect(result).toEqual({ id: validOid });
  });
});

describe("updateQuestion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia PATCH parcial", async () => {
    mockedApiFetch.mockResolvedValueOnce({ ok: true });

    await updateQuestion(validOid, { prompt: "Novo enunciado" });

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/questions/${validOid}`, {
      method: "PATCH",
      body: { prompt: "Novo enunciado" },
    });
  });
});

describe("deleteQuestion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia DELETE", async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await deleteQuestion(validOid);

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/questions/${validOid}`, {
      method: "DELETE",
    });
  });
});
