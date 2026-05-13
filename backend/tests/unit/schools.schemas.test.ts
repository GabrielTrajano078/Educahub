import { describe, expect, it } from "@jest/globals";
import { ZodError } from "zod";
import { createSchoolSchema, listSchoolsSchema } from "../../src/modules/schools/schools.schemas";

describe("createSchoolSchema", () => {
  it("aceita corpo valido com campos opcionais", () => {
    expect(
      createSchoolSchema.parse({
        name: "EMEF José de Alencar",
        city: "Fortaleza",
        municipalityCode: "2304400",
      }),
    ).toEqual({
      name: "EMEF José de Alencar",
      city: "Fortaleza",
      municipalityCode: "2304400",
    });
  });

  it("aceita apenas nome com tamanho minimo", () => {
    expect(createSchoolSchema.parse({ name: "AB" })).toEqual({ name: "AB" });
  });

  it("rejeita nome curto com too_small em name", () => {
    const r = createSchoolSchema.safeParse({ name: "A" });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "name" && i.code === "too_small")).toBe(true);
  });

  it("rejeita cidade curta com too_small em city", () => {
    const r = createSchoolSchema.safeParse({
      name: "EMEF Centro",
      city: "F",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "city" && i.code === "too_small")).toBe(true);
  });

  it("rejeita municipalityCode curto com too_small", () => {
    const r = createSchoolSchema.safeParse({
      name: "EMEF Centro",
      municipalityCode: "1",
    });

    expect(r.success).toBe(false);
    if (r.success) {
      throw new Error("esperado falha de parse");
    }
    expect(r.error).toBeInstanceOf(ZodError);
    expect(r.error.issues.some((i) => i.path[0] === "municipalityCode" && i.code === "too_small")).toBe(true);
  });
});

describe("listSchoolsSchema", () => {
  it("aceita query vazia", () => {
    expect(listSchoolsSchema.parse({})).toEqual({});
  });

  it("aplica trim em nameContains", () => {
    expect(listSchoolsSchema.parse({ nameContains: "  emef  " })).toEqual({
      nameContains: "emef",
    });
  });

  it("rejeita nameContains acima do limite com too_big", () => {
    const r = listSchoolsSchema.safeParse({
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
