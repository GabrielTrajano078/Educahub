import { describe, expect, it } from "@jest/globals";
import { normalizeSchoolName } from "../../src/lib/normalize-school-name";

describe("normalizeSchoolName", () => {
  it("normaliza exemplos obrigatórios da spec", () => {
    expect(normalizeSchoolName("Teste João")).toBe("TESTE JOAO");
    expect(normalizeSchoolName("EMEF   José de Alencar")).toBe("EMEF JOSE DE ALENCAR");
  });

  it("aplica trim nas extremidades", () => {
    expect(normalizeSchoolName("  EMEF Centro  ")).toBe("EMEF CENTRO");
  });

  it("colapsa espaços internos consecutivos", () => {
    expect(normalizeSchoolName("A    B")).toBe("A B");
  });

  it("retorna string vazia quando entrada só tem espaços", () => {
    expect(normalizeSchoolName("   ")).toBe("");
  });
});
