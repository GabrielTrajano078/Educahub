import { describe, expect, it } from "@jest/globals";
import { bootstrapAdminSchema, loginSchema } from "../../src/modules/auth/auth.schemas";
import { patchProfessorClassroomsSchema } from "../../src/modules/auth/users.routes";
import {
  BEARER_SECURITY,
  readComponentSchemaPropertyKeys,
  readComponentSchemaRequired,
  readOperationSecurity,
  readRequestBodySchemaRef,
  zodRequiredKeys,
  zodShapeKeys,
} from "./openapi-contract-helpers";

describe("contrato OpenAPI — auth", () => {
  it("LoginRequest required e properties alinham com loginSchema", () => {
    expect(readComponentSchemaRequired("LoginRequest")).toEqual(zodRequiredKeys(loginSchema));
    expect(readComponentSchemaPropertyKeys("LoginRequest")).toEqual(zodShapeKeys(loginSchema));
  });

  it("BootstrapAdminRequest required e properties alinham com bootstrapAdminSchema", () => {
    expect(readComponentSchemaRequired("BootstrapAdminRequest")).toEqual(zodRequiredKeys(bootstrapAdminSchema));
    expect(readComponentSchemaPropertyKeys("BootstrapAdminRequest")).toEqual(zodShapeKeys(bootstrapAdminSchema));
  });

  it("PatchProfessorClassroomsRequest alinha com patchProfessorClassroomsSchema", () => {
    expect(readComponentSchemaRequired("PatchProfessorClassroomsRequest")).toEqual(
      zodRequiredKeys(patchProfessorClassroomsSchema),
    );
    expect(readComponentSchemaPropertyKeys("PatchProfessorClassroomsRequest")).toEqual(
      zodShapeKeys(patchProfessorClassroomsSchema),
    );
  });

  it("POST /api/auth/login e bootstrap-admin sao publicos (sem bearer)", () => {
    expect(readOperationSecurity("/api/auth/login", "post")).toBeUndefined();
    expect(readOperationSecurity("/api/auth/bootstrap-admin", "post")).toBeUndefined();
  });

  it("GET /api/auth/me e PATCH classrooms exigem bearer", () => {
    expect(readOperationSecurity("/api/auth/me", "get")).toEqual(BEARER_SECURITY);
    expect(readOperationSecurity("/api/auth/users/{userId}/classrooms", "patch")).toEqual(BEARER_SECURITY);
  });

  it("POST login referencia LoginRequest e bootstrap referencia BootstrapAdminRequest", () => {
    expect(readRequestBodySchemaRef("/api/auth/login", "post")).toEqual({
      $ref: "#/components/schemas/LoginRequest",
    });
    expect(readRequestBodySchemaRef("/api/auth/bootstrap-admin", "post")).toEqual({
      $ref: "#/components/schemas/BootstrapAdminRequest",
    });
  });
});
