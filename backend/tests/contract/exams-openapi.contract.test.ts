import { describe, expect, it } from "@jest/globals";
import {
  createExamSchema,
  createOfficialAnswerKeySchema,
  generateAnswerSheetsSchema,
  listExamsSchema,
  simulatedBlueprintQuerySchema,
} from "../../src/modules/exams/exams.schemas";
import {
  BEARER_SECURITY,
  readComponentSchemaPropertyKeys,
  readComponentSchemaRequired,
  readOperationParameterNames,
  readOperationRequiredQueryParamNames,
  readOperationSecurity,
  readRequestBodySchemaRef,
  zodRequiredKeys,
  zodShapeKeys,
} from "./openapi-contract-helpers";

describe("contrato OpenAPI — provas", () => {
  it("expoe /api/exams GET e POST com seguranca bearer", () => {
    expect(readOperationSecurity("/api/exams", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/exams", "post")).toEqual(BEARER_SECURITY);
  });

  it("ExamRequest required e properties alinham com createExamSchema", () => {
    expect(readComponentSchemaRequired("ExamRequest")).toEqual(zodRequiredKeys(createExamSchema));
    expect(readComponentSchemaPropertyKeys("ExamRequest")).toEqual(zodShapeKeys(createExamSchema));
  });

  it("GET /api/exams declara os mesmos parametros que listExamsSchema", () => {
    expect(readOperationParameterNames("/api/exams", "get", "query")).toEqual(zodShapeKeys(listExamsSchema));
  });

  it("GET /api/exams/blueprint/simulado declara parametros obrigatorios do simulatedBlueprintQuerySchema", () => {
    expect(readOperationParameterNames("/api/exams/blueprint/simulado", "get", "query")).toEqual(
      zodShapeKeys(simulatedBlueprintQuerySchema),
    );
    expect(readOperationRequiredQueryParamNames("/api/exams/blueprint/simulado", "get")).toEqual(
      zodRequiredKeys(simulatedBlueprintQuerySchema),
    );
  });

  it("GET /api/exams/{id} declara parametro id e bearer", () => {
    expect(readOperationSecurity("/api/exams/{id}", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationParameterNames("/api/exams/{id}", "get", "path")).toEqual(["id"]);
  });

  it("answer-key e generate referenciam schemas e exigem bearer", () => {
    expect(readOperationSecurity("/api/exams/{id}/answer-key", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/exams/{id}/answer-key", "post")).toEqual(BEARER_SECURITY);
    expect(readRequestBodySchemaRef("/api/exams/{id}/answer-key", "post")).toEqual({
      $ref: "#/components/schemas/AnswerKeyRequest",
    });
    expect(readComponentSchemaPropertyKeys("AnswerKeyRequest")).toEqual(zodShapeKeys(createOfficialAnswerKeySchema));

    expect(readOperationSecurity("/api/exams/{id}/answer-sheets/generate", "post")).toEqual(BEARER_SECURITY);
    expect(readRequestBodySchemaRef("/api/exams/{id}/answer-sheets/generate", "post")).toEqual({
      $ref: "#/components/schemas/GenerateSheetsRequest",
    });
    expect(readComponentSchemaPropertyKeys("GenerateSheetsRequest")).toEqual(zodShapeKeys(generateAnswerSheetsSchema));
  });
});
