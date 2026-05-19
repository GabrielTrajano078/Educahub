import { describe, expect, it } from "@jest/globals";
import { ZodError } from "zod";
import {
  createExamSchema,
  createOfficialAnswerKeySchema,
  examIdParamSchema,
  generateAnswerSheetsSchema,
  listExamsSchema,
  simulatedBlueprintQuerySchema,
  updateExamSchema,
} from "../../src/modules/exams/exams.schemas";

const schoolOid = "507f1f77bcf86cd799439011";
const classroomOid = "507f1f77bcf86cd799439012";
const questionOid = "507f1f77bcf86cd799439013";

const examBase = {
  schoolId: schoolOid,
  classroomId: classroomOid,
  title: "Prova diagnóstica",
  discipline: "LP" as const,
  grade: "5" as const,
};

describe("createExamSchema", () => {
  it("aceita prova com questionIds e default SAEB", () => {
    expect(
      createExamSchema.parse({
        ...examBase,
        questionIds: [questionOid],
      }),
    ).toEqual({
      ...examBase,
      framework: "SAEB",
      questionIds: [questionOid],
    });
  });

  it("aceita PDF importado com questionCount", () => {
    expect(
      createExamSchema.parse({
        ...examBase,
        sourceType: "PDF_IMPORT",
        questionCount: 20,
      }),
    ).toEqual({
      ...examBase,
      framework: "SAEB",
      sourceType: "PDF_IMPORT",
      questionCount: 20,
    });
  });

  it("aceita blueprint por descritor", () => {
    expect(
      createExamSchema.parse({
        ...examBase,
        blueprint: [{ descriptor: "D1", count: 3 }],
      }),
    ).toEqual({
      ...examBase,
      framework: "SAEB",
      blueprint: [{ descriptor: "D1", count: 3 }],
    });
  });

  it("aceita blueprint por eixo", () => {
    expect(
      createExamSchema.parse({
        ...examBase,
        blueprintByAxis: [{ axis: "LEITURA", count: 4 }],
      }),
    ).toEqual({
      ...examBase,
      framework: "SAEB",
      blueprintByAxis: [{ axis: "LEITURA", count: 4 }],
    });
  });

  it("rejeita titulo curto com too_small em title", () => {
    const r = createExamSchema.safeParse({
      ...examBase,
      title: "AB",
      questionIds: [questionOid],
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "title" && i.code === "too_small")).toBe(true);
  });

  it("rejeita quando informa mais de uma fonte de questoes", () => {
    const r = createExamSchema.safeParse({
      ...examBase,
      questionIds: [questionOid],
      blueprint: [{ descriptor: "D1", count: 2 }],
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error.issues.some((i) => i.code === "custom")).toBe(true);
  });

  it("rejeita PDF importado sem questionCount", () => {
    const r = createExamSchema.safeParse({
      ...examBase,
      sourceType: "PDF_IMPORT",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error.issues.some((i) => i.code === "custom")).toBe(true);
  });
});

describe("updateExamSchema", () => {
  it("aceita atualizacao parcial", () => {
    expect(updateExamSchema.parse({ title: "Prova revisada" })).toEqual({
      title: "Prova revisada",
    });
  });

  it("rejeita questionIds vazio", () => {
    const r = updateExamSchema.safeParse({ questionIds: [] });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "questionIds" && i.code === "too_small")).toBe(true);
  });
});

describe("listExamsSchema", () => {
  it("aceita query vazia", () => {
    expect(listExamsSchema.parse({})).toEqual({});
  });

  it("aceita filtros opcionais", () => {
    expect(
      listExamsSchema.parse({
        schoolId: schoolOid,
        classroomId: classroomOid,
        discipline: "MAT",
        grade: "9",
        descriptor: "D2",
        axis: "NUMEROS",
      }),
    ).toEqual({
      schoolId: schoolOid,
      classroomId: classroomOid,
      discipline: "MAT",
      grade: "9",
      descriptor: "D2",
      axis: "NUMEROS",
    });
  });
});

describe("simulatedBlueprintQuerySchema", () => {
  it("exige disciplina e ano", () => {
    expect(
      simulatedBlueprintQuerySchema.parse({
        discipline: "LP",
        grade: "5",
      }),
    ).toEqual({
      discipline: "LP",
      grade: "5",
    });
  });
});

describe("examIdParamSchema", () => {
  it("aceita ObjectId valido", () => {
    expect(examIdParamSchema.parse({ id: schoolOid })).toEqual({ id: schoolOid });
  });

  it("rejeita id invalido", () => {
    const r = examIdParamSchema.safeParse({ id: "prova-1" });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error.issues.some((i) => i.path[0] === "id")).toBe(true);
  });
});

describe("createOfficialAnswerKeySchema", () => {
  it("aceita corpo vazio", () => {
    expect(createOfficialAnswerKeySchema.parse({})).toEqual({});
  });

  it("aceita itens de gabarito", () => {
    expect(
      createOfficialAnswerKeySchema.parse({
        notes: "Revisão pedagógica",
        items: [{ order: 1, correctAnswer: "B", isVoided: false }],
      }),
    ).toEqual({
      notes: "Revisão pedagógica",
      items: [{ order: 1, correctAnswer: "B", isVoided: false }],
    });
  });
});

describe("generateAnswerSheetsSchema", () => {
  it("aceita corpo vazio", () => {
    expect(generateAnswerSheetsSchema.parse({})).toEqual({});
  });

  it("coerce questionsPerPage", () => {
    expect(generateAnswerSheetsSchema.parse({ questionsPerPage: "20" })).toEqual({
      questionsPerPage: 20,
    });
  });
});
