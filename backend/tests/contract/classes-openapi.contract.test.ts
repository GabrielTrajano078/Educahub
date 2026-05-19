import { describe, expect, it } from "@jest/globals";
import { createClassroomSchema, listClassroomsSchema } from "../../src/modules/classes/classes.schemas";
import {
  BEARER_SECURITY,
  readComponentSchemaPropertyKeys,
  readComponentSchemaRequired,
  readOperationParameterNames,
  readOperationSecurity,
  readPost201ResponseSchema,
  zodRequiredKeys,
  zodShapeKeys,
} from "./openapi-contract-helpers";

describe("contrato OpenAPI — turmas", () => {
  it("expoe /api/classes GET e POST com seguranca bearer", () => {
    expect(readOperationSecurity("/api/classes", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/classes", "post")).toEqual(BEARER_SECURITY);
  });

  it("ClassroomRequest required alinha com createClassroomSchema", () => {
    expect(readComponentSchemaRequired("ClassroomRequest")).toEqual(zodRequiredKeys(createClassroomSchema));
  });

  it("ClassroomRequest properties cobrem os mesmos campos que createClassroomSchema", () => {
    expect(readComponentSchemaPropertyKeys("ClassroomRequest")).toEqual(zodShapeKeys(createClassroomSchema));
  });

  it("GET /api/classes declara os mesmos parametros opcionais que listClassroomsSchema", () => {
    expect(readOperationParameterNames("/api/classes", "get", "query")).toEqual(zodShapeKeys(listClassroomsSchema));
  });

  it("POST 201 referencia IdResponse", () => {
    expect(readPost201ResponseSchema("/api/classes")).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });
});
