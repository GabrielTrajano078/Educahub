import { describe, expect, it } from "@jest/globals";
import { createStudentSchema, listStudentsSchema } from "../../src/modules/students/students.schemas";
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

describe("contrato OpenAPI — alunos", () => {
  it("expoe /api/students GET e POST com seguranca bearer", () => {
    expect(readOperationSecurity("/api/students", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/students", "post")).toEqual(BEARER_SECURITY);
  });

  it("StudentRequest required alinha com createStudentSchema", () => {
    expect(readComponentSchemaRequired("StudentRequest")).toEqual(zodRequiredKeys(createStudentSchema));
  });

  it("StudentRequest properties cobrem os mesmos campos que createStudentSchema", () => {
    expect(readComponentSchemaPropertyKeys("StudentRequest")).toEqual(zodShapeKeys(createStudentSchema));
  });

  it("GET /api/students declara os mesmos parametros opcionais que listStudentsSchema", () => {
    expect(readOperationParameterNames("/api/students", "get", "query")).toEqual(zodShapeKeys(listStudentsSchema));
  });

  it("POST 201 referencia IdResponse", () => {
    expect(readPost201ResponseSchema("/api/students")).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });

  it("Student expõe fullName e normalizedFullName obrigatórios na resposta", () => {
    expect(readComponentSchemaRequired("Student")).toEqual([
      "_id",
      "classroomId",
      "fullName",
      "normalizedFullName",
      "registrationCode",
      "schoolId",
    ]);
    expect(readComponentSchemaPropertyKeys("Student")).toEqual([
      "_id",
      "classroomId",
      "createdAt",
      "fullName",
      "normalizedFullName",
      "registrationCode",
      "schoolId",
      "updatedAt",
    ]);
  });

  it("GET /api/students 200 retorna array de Student", () => {
    expect(readResponseSchema("/api/students", "get", "200")).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/Student" },
    });
  });
});
