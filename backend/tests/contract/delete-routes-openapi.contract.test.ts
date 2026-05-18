import { describe, expect, it } from "@jest/globals";
import { openApiDocument } from "../../src/docs/openapi";

const DELETE_PATHS = [
  "/api/schools/{id}",
  "/api/classes/{id}",
  "/api/students/{id}",
  "/api/questions/{id}",
  "/api/exams/{id}",
] as const;

describe("contrato OpenAPI — rotas DELETE", () => {
  it.each(DELETE_PATHS)("expoe DELETE em %s com bearer e resposta 204", (path) => {
    const operation = openApiDocument.paths[path]?.delete;
    expect(operation).toBeDefined();
    expect(operation && typeof operation === "object" && "security" in operation ? operation.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
    expect(
      operation && typeof operation === "object" && "responses" in operation
        ? (operation as { responses?: Record<string, unknown> }).responses?.["204"]
        : undefined,
    ).toBeDefined();
    expect(
      operation && typeof operation === "object" && "parameters" in operation
        ? (operation as { parameters?: readonly { name?: string; in?: string }[] }).parameters
        : undefined,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ name: "id", in: "path" })]));
  });
});
