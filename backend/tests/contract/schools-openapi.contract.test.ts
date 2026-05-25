import { describe, expect, it } from "@jest/globals";
import { createSchoolSchema, listSchoolsSchema } from "../../src/modules/schools/schools.schemas";
import {
  BEARER_SECURITY,
  readComponentSchemaPropertyKeys,
  readComponentSchemaRequired,
  readOperationParameterNames,
  readOperationSecurity,
  readPost201ResponseSchema,
  readResponseSchema,
  zodRequiredKeys,
  zodShapeKeys,
} from "./openapi-contract-helpers";

describe("contrato OpenAPI — escolas", () => {
  it("expoe /api/schools GET e POST com seguranca bearer", () => {
    expect(readOperationSecurity("/api/schools", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/schools", "post")).toEqual(BEARER_SECURITY);
  });

  it("SchoolRequest required alinha com createSchoolSchema", () => {
    expect(readComponentSchemaRequired("SchoolRequest")).toEqual(zodRequiredKeys(createSchoolSchema));
  });

  it("SchoolRequest properties cobrem os mesmos campos que createSchoolSchema", () => {
    expect(readComponentSchemaPropertyKeys("SchoolRequest")).toEqual(zodShapeKeys(createSchoolSchema));
  });

  it("GET /api/schools declara os mesmos parametros opcionais que listSchoolsSchema", () => {
    expect(readOperationParameterNames("/api/schools", "get", "query")).toEqual(zodShapeKeys(listSchoolsSchema));
  });

  it("POST 201 referencia IdResponse", () => {
    expect(readPost201ResponseSchema("/api/schools")).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });

  it("School expõe _id, name e normalizedName obrigatorios na resposta", () => {
    expect(readComponentSchemaRequired("School")).toEqual(["_id", "name", "normalizedName"]);
    expect(readComponentSchemaPropertyKeys("School")).toEqual([
      "_id",
      "city",
      "createdAt",
      "municipalityCode",
      "name",
      "normalizedName",
      "updatedAt",
    ]);
  });

  it("GET /api/schools 200 retorna array de School", () => {
    expect(readResponseSchema("/api/schools", "get", "200")).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/School" },
    });
  });

  it("GET /api/schools/{id} 200 referencia School", () => {
    expect(readResponseSchema("/api/schools/{id}", "get", "200")).toEqual({
      $ref: "#/components/schemas/School",
    });
  });

});
