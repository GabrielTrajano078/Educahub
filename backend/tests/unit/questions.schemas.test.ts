import { describe, expect, it } from "@jest/globals";
import { ZodError } from "zod";
import {
  createQuestionSchema,
  listDescriptorsSchema,
  listQuestionsSchema,
  questionIdParamsSchema,
  questionSuggestionsSchema,
  updateQuestionSchema,
} from "../../src/modules/questions/questions.schemas";

const validOid = "507f1f77bcf86cd799439011";

const validQuestionBody = {
  discipline: "LP" as const,
  grade: "5" as const,
  descriptor: "D1",
  prompt: "Enunciado da questão",
  optionA: "A",
  optionB: "B",
  optionC: "C",
  optionD: "D",
  answer: "A" as const,
};

describe("createQuestionSchema", () => {
  it("aceita corpo valido e aplica default SAEB em framework", () => {
    expect(createQuestionSchema.parse(validQuestionBody)).toEqual({
      ...validQuestionBody,
      framework: "SAEB",
    });
  });

  it("aceita eixo curricular opcional", () => {
    expect(
      createQuestionSchema.parse({
        ...validQuestionBody,
        axis: "LEITURA",
      }),
    ).toEqual({
      ...validQuestionBody,
      framework: "SAEB",
      axis: "LEITURA",
    });
  });

  it("rejeita descritor vazio com too_small em descriptor", () => {
    const r = createQuestionSchema.safeParse({
      ...validQuestionBody,
      descriptor: "",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "descriptor" && i.code === "too_small")).toBe(true);
  });

  it("rejeita disciplina invalida", () => {
    const r = createQuestionSchema.safeParse({
      ...validQuestionBody,
      discipline: "HIST",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "discipline")).toBe(true);
  });

  it("rejeita resposta fora do enum", () => {
    const r = createQuestionSchema.safeParse({
      ...validQuestionBody,
      answer: "E",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "answer")).toBe(true);
  });
});

describe("updateQuestionSchema", () => {
  it("aceita atualizacao parcial", () => {
    expect(updateQuestionSchema.parse({ prompt: "Novo enunciado" })).toEqual({
      prompt: "Novo enunciado",
      framework: "SAEB",
    });
  });
});

describe("listQuestionsSchema", () => {
  it("aceita query vazia", () => {
    expect(listQuestionsSchema.parse({})).toEqual({});
  });

  it("aceita filtros opcionais validos", () => {
    expect(
      listQuestionsSchema.parse({
        discipline: "MAT",
        grade: "9",
        framework: "SAEB",
        descriptor: "D3",
        axis: "ALGEBRA",
      }),
    ).toEqual({
      discipline: "MAT",
      grade: "9",
      framework: "SAEB",
      descriptor: "D3",
      axis: "ALGEBRA",
    });
  });
});

describe("listDescriptorsSchema", () => {
  it("exige disciplina e ano", () => {
    expect(
      listDescriptorsSchema.parse({
        discipline: "LP",
        grade: "5",
      }),
    ).toEqual({
      discipline: "LP",
      grade: "5",
    });
  });

  it("rejeita query sem disciplina", () => {
    const r = listDescriptorsSchema.safeParse({ grade: "5" });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "discipline")).toBe(true);
  });
});

describe("questionIdParamsSchema", () => {
  it("aceita ObjectId valido", () => {
    expect(questionIdParamsSchema.parse({ id: validOid })).toEqual({ id: validOid });
  });

  it("rejeita id invalido", () => {
    const r = questionIdParamsSchema.safeParse({ id: "x" });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "id")).toBe(true);
  });
});

describe("questionSuggestionsSchema", () => {
  it("aplica defaults em framework, weakThreshold e limit", () => {
    expect(
      questionSuggestionsSchema.parse({
        classroomId: validOid,
        discipline: "LP",
        grade: "5",
      }),
    ).toEqual({
      classroomId: validOid,
      discipline: "LP",
      grade: "5",
      framework: "SAEB",
    });
  });

  it("coerce limit e weakThreshold", () => {
    expect(
      questionSuggestionsSchema.parse({
        classroomId: validOid,
        discipline: "MAT",
        grade: "9",
        weakThreshold: "60",
        limit: "10",
      }),
    ).toEqual({
      classroomId: validOid,
      discipline: "MAT",
      grade: "9",
      framework: "SAEB",
      weakThreshold: 60,
      limit: 10,
    });
  });

  it("rejeita classroomId invalido", () => {
    const r = questionSuggestionsSchema.safeParse({
      classroomId: "turma-1",
      discipline: "LP",
      grade: "5",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "classroomId")).toBe(true);
  });
});
