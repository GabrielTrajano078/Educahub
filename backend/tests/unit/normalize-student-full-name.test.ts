import { describe, expect, it } from "@jest/globals";
import { normalizeStudentFullName } from "../../src/lib/normalize-student-full-name";

describe("normalizeStudentFullName", () => {
  it("normaliza nome com acentos e espaços extras", () => {
    expect(normalizeStudentFullName("Ana Clara Sousa")).toBe("ANA CLARA SOUSA");
    expect(normalizeStudentFullName("José   da Silva")).toBe("JOSE DA SILVA");
  });

  it("reconstrói letras espaçadas e preposições", () => {
    expect(normalizeStudentFullName("J o s e   d e   S o u z a")).toBe("JOSE DE SOUZA");
  });

  it("aplica trim nas extremidades", () => {
    expect(normalizeStudentFullName("  Maria  ")).toBe("MARIA");
  });
});
