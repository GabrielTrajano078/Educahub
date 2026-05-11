import { describe, expect, it } from "@jest/globals";
import { ZodError } from "zod";
import { createClassroomSchema, listClassroomsSchema } from "../../src/modules/classes/classes.schemas";

const validOid = "507f1f77bcf86cd799439011";

describe("createClassroomSchema", () => {
  it("aceita corpo valido", () => {
    const parsed = createClassroomSchema.parse({
      schoolId: validOid,
      name: "  5º Ano A  ",
      grade: "5",
    });

    expect(parsed).toEqual({
      schoolId: validOid,
      name: "5º Ano A",
      grade: "5",
    });
  });

  it("rejeita schoolId invalido com issue em schoolId", () => {
    const r = createClassroomSchema.safeParse({
      schoolId: "x",
      name: "5º Ano A",
      grade: "5",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "schoolId")).toBe(true);
  });

  it("rejeita nome vazio com too_small em name", () => {
    const r = createClassroomSchema.safeParse({
      schoolId: validOid,
      name: "   ",
      grade: "5",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "name" && i.code === "too_small")).toBe(true);
  });

  it("rejeita ano fora da matriz", () => {
    const r = createClassroomSchema.safeParse({
      schoolId: validOid,
      name: "6º Ano A",
      grade: "6",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "grade")).toBe(true);
  });
});

describe("listClassroomsSchema", () => {
  it("aceita query vazia", () => {
    expect(listClassroomsSchema.parse({})).toEqual({});
  });

  it("aceita filtros opcionais validos", () => {
    expect(
      listClassroomsSchema.parse({
        schoolId: validOid,
        grade: "9",
        nameContains: "  turma B  ",
      }),
    ).toEqual({
      schoolId: validOid,
      grade: "9",
      nameContains: "turma B",
    });
  });

  it("rejeita nameContains acima do limite com too_big", () => {
    const r = listClassroomsSchema.safeParse({
      nameContains: "x".repeat(201),
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "nameContains" && i.code === "too_big")).toBe(true);
  });
});
