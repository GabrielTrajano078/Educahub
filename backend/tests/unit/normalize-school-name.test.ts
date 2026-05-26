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

  it("reconstrói nome digitado com espaço entre letras", () => {
    expect(normalizeSchoolName("J o s e   d e   A l e n c a r")).toBe("JOSE DE ALENCAR");
    expect(normalizeSchoolName("J O S E D E A L E N C A R D E S O U Z A")).toBe(
      "JOSE DE ALENCAR DE SOUZA",
    );
  });

  it("não altera nomes já em palavras normais", () => {
    expect(normalizeSchoolName("EMEF Centro")).toBe("EMEF CENTRO");
  });
});
