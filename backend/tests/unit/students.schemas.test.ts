import { describe, expect, it } from "@jest/globals";
import { ZodError } from "zod";
import { createStudentSchema, listStudentsSchema } from "../../src/modules/students/students.schemas";

const validOid = "507f1f77bcf86cd799439011";

describe("createStudentSchema", () => {
  it("aceita corpo valido", () => {
    const parsed = createStudentSchema.parse({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "  Ana Silva  ",
      registrationCode: "  MAT-001  ",
    });
    expect(parsed).toEqual({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "Ana Silva",
      registrationCode: "MAT-001",
    });
  });

  it("rejeita schoolId invalido com issue em schoolId", () => {
    const r = createStudentSchema.safeParse({
      schoolId: "x",
      classroomId: validOid,
      fullName: "ab",
      registrationCode: "cd",
    });
    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "schoolId")).toBe(true);
  });

  it("rejeita nome curto com too_small em fullName", () => {
    const r = createStudentSchema.safeParse({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "a",
      registrationCode: "cd",
    });
    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    const nameIssues = r.error.issues.filter((i) => i.path[0] === "fullName");
    expect(nameIssues.length).toBeGreaterThan(0);
    expect(nameIssues.every((i) => i.code === "too_small")).toBe(true);
  });

  it("rejeita matricula curta com too_small em registrationCode", () => {
    const r = createStudentSchema.safeParse({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "ab",
      registrationCode: "c",
    });
    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    const regIssues = r.error.issues.filter((i) => i.path[0] === "registrationCode");
    expect(regIssues.length).toBeGreaterThan(0);
    expect(regIssues.every((i) => i.code === "too_small")).toBe(true);
  });
});

describe("listStudentsSchema", () => {
  it("aceita query vazia", () => {
    expect(listStudentsSchema.parse({})).toEqual({});
  });

  it("aceita filtros opcionais validos", () => {
    expect(
      listStudentsSchema.parse({
        schoolId: validOid,
        classroomId: validOid,
        grade: "5",
        fullNameContains: "  maria  ",
      }),
    ).toEqual({
      schoolId: validOid,
      classroomId: validOid,
      grade: "5",
      fullNameContains: "maria",
    });
  });

  it("rejeita fullNameContains acima do limite com too_big", () => {
    const r = listStudentsSchema.safeParse({
      fullNameContains: "x".repeat(201),
    });
    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "fullNameContains" && i.code === "too_big")).toBe(true);
  });
});
