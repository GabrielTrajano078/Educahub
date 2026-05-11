import { describe, expect, it } from "@jest/globals";
import { openApiDocument } from "../../src/docs/openapi";
import { createClassroomSchema, listClassroomsSchema } from "../../src/modules/classes/classes.schemas";

function sortFieldNames(names: string[]): string[] {
  const copy = [...names];
  copy.sort((a, b) => a.localeCompare(b));
  return copy;
}

function readClassroomRequestRequired(): string[] {
  const schema = openApiDocument.components?.schemas?.ClassroomRequest;
  if (!schema || typeof schema !== "object" || !("required" in schema)) {
    return [];
  }
  const req = (schema as { required?: unknown }).required;
  if (!Array.isArray(req)) {
    return [];
  }
  return req.filter((item): item is string => typeof item === "string");
}

function readClassroomRequestPropertyKeys(): string[] {
  const schema = openApiDocument.components?.schemas?.ClassroomRequest;
  if (!schema || typeof schema !== "object" || !("properties" in schema)) {
    return [];
  }
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== "object") {
    return [];
  }
  return Object.keys(props).filter((k) => typeof k === "string");
}

describe("contrato OpenAPI — turmas", () => {
  it("expoe /api/classes GET e POST com seguranca bearer", () => {
    const paths = openApiDocument.paths;
    const classes = paths["/api/classes"];
    expect(classes?.get).toBeDefined();
    expect(classes?.post).toBeDefined();

    const getOp = classes?.get;
    const postOp = classes?.post;
    expect(getOp && typeof getOp === "object" && "security" in getOp ? getOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
    expect(postOp && typeof postOp === "object" && "security" in postOp ? postOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it("ClassroomRequest required alinha com createClassroomSchema", () => {
    const specRequired = sortFieldNames(readClassroomRequestRequired());
    const zodKeys = sortFieldNames(Object.keys(createClassroomSchema.shape));
    expect(specRequired).toEqual(zodKeys);
  });

  it("ClassroomRequest properties cobrem os mesmos campos que createClassroomSchema", () => {
    const specProps = sortFieldNames(readClassroomRequestPropertyKeys());
    const zodKeys = sortFieldNames(Object.keys(createClassroomSchema.shape));
    expect(specProps).toEqual(zodKeys);
  });

  it("GET /api/classes declara os mesmos parametros opcionais que listClassroomsSchema", () => {
    const getOp = openApiDocument.paths["/api/classes"]?.get;
    expect(getOp && typeof getOp === "object" && "parameters" in getOp).toBe(true);
    if (!getOp || typeof getOp !== "object" || !("parameters" in getOp)) {
      throw new Error("OpenAPI: GET /api/classes sem parameters");
    }
    const rawParams = (getOp as unknown as { parameters?: readonly { name?: string }[] }).parameters ?? [];
    const namesFromOpenApi = sortFieldNames(
      rawParams.map((p) => p.name).filter((n): n is string => typeof n === "string"),
    );
    const namesFromZod = sortFieldNames(Object.keys(listClassroomsSchema.shape));
    expect(namesFromOpenApi).toEqual(namesFromZod);
  });

  it("POST 201 referencia IdResponse", () => {
    const post = openApiDocument.paths["/api/classes"]?.post;
    expect(post).toBeDefined();
    expect(post && typeof post === "object" && "responses" in post).toBe(true);
    const responses = (post as { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> })
      .responses;
    const ref = responses?.["201"]?.content?.["application/json"]?.schema;
    expect(ref).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });
});
