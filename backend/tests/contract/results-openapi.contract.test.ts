import { describe, expect, it } from "@jest/globals";
import type { ZodObject, ZodRawShape } from "zod";
import {
  classroomHeatmapSchema,
  classroomRankingSchema,
  classroomReportSchema,
  diagnosisByClassroomSchema,
  municipalitySummarySchema,
  registerAnswerSheetSchema,
  schoolSummarySchema,
  studentSummarySchema,
  submitMarksByOrderSchema,
} from "../../src/modules/results/results.schemas";
import {
  BEARER_SECURITY,
  readComponentSchemaPropertyKeys,
  readComponentSchemaRequired,
  readOperationParameterNames,
  readOperationSecurity,
  readRequestBodySchemaRef,
  zodRequiredKeys,
  zodShapeKeys,
} from "./openapi-contract-helpers";

function expectPathAndQueryParams(path: string, method: "get", zodSchema: ZodObject<ZodRawShape>): void {
  const query = readOperationParameterNames(path, method, "query");
  const pathParams = readOperationParameterNames(path, method, "path");
  const combined = [...query, ...pathParams].sort((a, b) => a.localeCompare(b));
  expect(combined).toEqual(zodShapeKeys(zodSchema));
}

describe("contrato OpenAPI — resultados", () => {
  it("RegisterAnswerSheetRequest alinha com registerAnswerSheetSchema", () => {
    expect(readComponentSchemaRequired("RegisterAnswerSheetRequest")).toEqual(
      zodRequiredKeys(registerAnswerSheetSchema),
    );
    expect(readComponentSchemaPropertyKeys("RegisterAnswerSheetRequest")).toEqual(
      zodShapeKeys(registerAnswerSheetSchema),
    );
  });

  it("CorrectionByOrderRequest alinha com submitMarksByOrderSchema", () => {
    expect(readComponentSchemaRequired("CorrectionByOrderRequest")).toEqual(
      zodRequiredKeys(submitMarksByOrderSchema),
    );
    expect(readComponentSchemaPropertyKeys("CorrectionByOrderRequest")).toEqual(
      zodShapeKeys(submitMarksByOrderSchema),
    );
  });

  it("POST /api/results/answer-sheets e corrections/by-order exigem bearer", () => {
    expect(readOperationSecurity("/api/results/answer-sheets", "post")).toEqual(BEARER_SECURITY);
    expect(readRequestBodySchemaRef("/api/results/answer-sheets", "post")).toEqual({
      $ref: "#/components/schemas/RegisterAnswerSheetRequest",
    });
    expect(readOperationSecurity("/api/results/corrections/by-order", "post")).toEqual(BEARER_SECURITY);
    expect(readRequestBodySchemaRef("/api/results/corrections/by-order", "post")).toEqual({
      $ref: "#/components/schemas/CorrectionByOrderRequest",
    });
  });

  it("GET diagnosis/classroom alinha parametros com diagnosisByClassroomSchema", () => {
    expect(readOperationSecurity("/api/results/diagnosis/classroom", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationParameterNames("/api/results/diagnosis/classroom", "get", "query")).toEqual(
      zodShapeKeys(diagnosisByClassroomSchema),
    );
  });

  it("GET diagnosis/classroom/by-axis alinha parametros com diagnosisByClassroomSchema", () => {
    expect(readOperationSecurity("/api/results/diagnosis/classroom/by-axis", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationParameterNames("/api/results/diagnosis/classroom/by-axis", "get", "query")).toEqual(
      zodShapeKeys(diagnosisByClassroomSchema),
    );
  });

  it("GET endpoints de resumo e relatorio alinham path+query com schemas Zod", () => {
    const cases: Array<[string, ZodObject<ZodRawShape>]> = [
      ["/api/results/student/{studentId}/summary", studentSummarySchema],
      ["/api/results/classroom/{classroomId}/ranking", classroomRankingSchema],
      ["/api/results/classroom/{classroomId}/heatmap", classroomHeatmapSchema],
      ["/api/results/school/{schoolId}/summary", schoolSummarySchema],
      ["/api/results/municipality/summary", municipalitySummarySchema],
      ["/api/results/reports/classroom/{classroomId}", classroomReportSchema],
    ];

    for (const [path, schema] of cases) {
      expect(readOperationSecurity(path, "get")).toEqual(BEARER_SECURITY);
      expectPathAndQueryParams(path, "get", schema);
    }
  });
});
