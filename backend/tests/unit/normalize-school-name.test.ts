import { describe, expect, it } from "@jest/globals";
import { normalizeSchoolName } from "../../src/lib/normalize-school-name";

describe("normalizeSchoolName", () => {
  it("converte para maiúsculas", () => {
    expect(normalizeSchoolName("escola teste")).toBe("ESCOLA TESTE");
  });

  it("remove diacríticos", () => {
    expect(normalizeSchoolName("Teste João")).toBe("TESTE JOAO");
    expect(normalizeSchoolName("EMEF José de Alencar")).toBe("EMEF JOSE DE ALENCAR");
    expect(normalizeSchoolName("Escola Ítalo Barbosa")).toBe("ESCOLA ITALO BARBOSA");
  });

  it("colapsa espaços internos múltiplos", () => {
    expect(normalizeSchoolName("EMEF   José  de Alencar")).toBe("EMEF JOSE DE ALENCAR");
  });

  it("remove espaços nas extremidades", () => {
    expect(normalizeSchoolName("  Escola Central  ")).toBe("ESCOLA CENTRAL");
  });

  it("é determinístico: mesma entrada sempre gera mesma saída", () => {
    const input = "  Çedilha  Ñoño  ";
    expect(normalizeSchoolName(input)).toBe(normalizeSchoolName(input));
  });

  it("trata string vazia", () => {
    expect(normalizeSchoolName("")).toBe("");
  });

  it("trata string só de espaços", () => {
    expect(normalizeSchoolName("   ")).toBe("");
  });
});
