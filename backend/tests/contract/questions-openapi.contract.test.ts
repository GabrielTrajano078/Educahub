import { describe, expect, it } from "@jest/globals";
import { openApiDocument } from "../../src/docs/openapi";
import {
  createQuestionSchema,
  listDescriptorsSchema,
  listQuestionsSchema,
  questionSuggestionsSchema,
} from "../../src/modules/questions/questions.schemas";
import {
  BEARER_SECURITY,
  readComponentSchemaPropertyKeys,
  readComponentSchemaRequired,
  readOperationParameterNames,
  readOperationRequiredQueryParamNames,
  readOperationSecurity,
  readPost201ResponseSchema,
  zodRequiredKeys,
  zodShapeKeys,
} from "./openapi-contract-helpers";

describe("contrato OpenAPI — questoes", () => {
  it("expoe /api/questions GET e POST com seguranca bearer", () => {
    const questions = openApiDocument.paths["/api/questions"] as
      | { get?: unknown; post?: unknown }
      | undefined;
    expect(questions?.get).toBeDefined();
    expect(questions?.post).toBeDefined();
    expect(readOperationSecurity("/api/questions", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/questions", "post")).toEqual(BEARER_SECURITY);
  });

  it("QuestionRequest required e properties alinham com createQuestionSchema", () => {
    expect(readComponentSchemaRequired("QuestionRequest")).toEqual(zodRequiredKeys(createQuestionSchema));
    expect(readComponentSchemaPropertyKeys("QuestionRequest")).toEqual(zodShapeKeys(createQuestionSchema));
  });

  it("GET /api/questions declara os mesmos parametros que listQuestionsSchema", () => {
    expect(readOperationParameterNames("/api/questions", "get", "query")).toEqual(zodShapeKeys(listQuestionsSchema));
  });

  it("GET /api/questions/descriptors declara parametros de listDescriptorsSchema", () => {
    expect(readOperationParameterNames("/api/questions/descriptors", "get", "query")).toEqual(
      zodShapeKeys(listDescriptorsSchema),
    );
    expect(readOperationRequiredQueryParamNames("/api/questions/descriptors", "get")).toEqual(
      zodRequiredKeys(listDescriptorsSchema),
    );
  });

  it("GET /api/questions/suggestions declara parametros de questionSuggestionsSchema", () => {
    expect(readOperationParameterNames("/api/questions/suggestions", "get", "query")).toEqual(
      zodShapeKeys(questionSuggestionsSchema),
    );
    expect(readOperationRequiredQueryParamNames("/api/questions/suggestions", "get")).toEqual(
      zodRequiredKeys(questionSuggestionsSchema),
    );
  });

  it("POST 201 referencia IdResponse", () => {
    expect(readPost201ResponseSchema("/api/questions")).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });
});
