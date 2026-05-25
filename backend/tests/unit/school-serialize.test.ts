import { describe, expect, it } from "@jest/globals";
import { serializeSchool } from "../../src/modules/schools/school-serialize";

describe("serializeSchool", () => {
  it("preserva normalizedName quando já persistido", () => {
    expect(
      serializeSchool({
        _id: "507f1f77bcf86cd799439011",
        name: "Teste João",
        normalizedName: "TESTE JOAO",
      }),
    ).toEqual({
      _id: "507f1f77bcf86cd799439011",
      name: "Teste João",
      normalizedName: "TESTE JOAO",
    });
  });

  it("deriva normalizedName a partir de name em documento legado", () => {
    expect(
      serializeSchool({
        _id: "507f1f77bcf86cd799439011",
        name: "EMEF Jose de Alencar",
      }),
    ).toEqual({
      _id: "507f1f77bcf86cd799439011",
      name: "EMEF Jose de Alencar",
      normalizedName: "EMEF JOSE DE ALENCAR",
    });
  });
});
