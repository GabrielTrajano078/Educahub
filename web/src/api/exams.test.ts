import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api-client";
import {
  createExam,
  deleteExam,
  fetchExam,
  fetchSimulatedBlueprint,
  generateAnswerSheets,
  listExams,
  publishAnswerKey,
  updateExam,
} from "./exams";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

const schoolOid = "507f1f77bcf86cd799439011";
const classroomOid = "507f1f77bcf86cd799439012";
const examOid = "507f1f77bcf86cd799439013";
const questionOid = "507f1f77bcf86cd799439014";

describe("listExams", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca sem query quando filtro vazio", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    await listExams();

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/exams");
  });

  it("monta query string com filtros", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    await listExams({
      schoolId: schoolOid,
      classroomId: classroomOid,
      discipline: "LP",
      grade: "5",
      descriptor: "D1",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith(
      `/api/exams?schoolId=${schoolOid}&classroomId=${classroomOid}&discipline=LP&grade=5&descriptor=D1`,
    );
  });
});

describe("fetchExam", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca prova por id", async () => {
    mockedApiFetch.mockResolvedValueOnce({ _id: examOid, questions: [] });

    await fetchExam(examOid);

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/exams/${examOid}`);
  });
});

describe("createExam", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia POST com corpo da prova", async () => {
    mockedApiFetch.mockResolvedValueOnce({ id: examOid, examCode: "ABC12345", totalQuestions: 1 });

    const body = {
      schoolId: schoolOid,
      classroomId: classroomOid,
      title: "Prova diagnóstica",
      discipline: "LP" as const,
      grade: "5" as const,
      questionIds: [questionOid],
    };

    const result = await createExam(body);

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/exams", {
      method: "POST",
      body,
    });
    expect(result).toEqual({ id: examOid, examCode: "ABC12345", totalQuestions: 1 });
  });
});

describe("updateExam", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia PATCH com id codificado", async () => {
    mockedApiFetch.mockResolvedValueOnce({ id: examOid });

    await updateExam(examOid, {
      schoolId: schoolOid,
      classroomId: classroomOid,
      title: "Prova revisada",
      discipline: "LP",
      grade: "5",
    });

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/exams/${encodeURIComponent(examOid)}`, {
      method: "PATCH",
      body: {
        schoolId: schoolOid,
        classroomId: classroomOid,
        title: "Prova revisada",
        discipline: "LP",
        grade: "5",
      },
    });
  });
});

describe("deleteExam", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("envia DELETE com id codificado", async () => {
    mockedApiFetch.mockResolvedValueOnce(null);

    await deleteExam(examOid);

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/exams/${encodeURIComponent(examOid)}`, {
      method: "DELETE",
    });
  });
});

describe("fetchSimulatedBlueprint", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca blueprint do simulado", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      framework: "SAEB",
      discipline: "LP",
      grade: "5",
      blueprintByAxis: [],
      totalQuestions: 14,
    });

    const result = await fetchSimulatedBlueprint({ discipline: "LP", grade: "5" });

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/exams/blueprint/simulado?discipline=LP&grade=5");
    expect(result.totalQuestions).toBe(14);
  });
});

describe("publishAnswerKey", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("publica gabarito oficial", async () => {
    mockedApiFetch.mockResolvedValueOnce({ id: "key1", version: 1, totalItems: 10 });

    await publishAnswerKey(examOid, { notes: "ok" });

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/exams/${examOid}/answer-key`, {
      method: "POST",
      body: { notes: "ok" },
    });
  });
});

describe("generateAnswerSheets", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("gera cartões-resposta", async () => {
    mockedApiFetch.mockResolvedValueOnce({
      batchFileId: "f1",
      url: "/files/batch.pdf",
      totalSheets: 2,
      answerSheetIds: ["s1", "s2"],
    });

    await generateAnswerSheets(examOid, { questionsPerPage: 20 });

    expect(mockedApiFetch).toHaveBeenCalledWith(`/api/exams/${examOid}/answer-sheets/generate`, {
      method: "POST",
      body: { questionsPerPage: 20 },
    });
  });
});
