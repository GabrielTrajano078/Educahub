import { describe, expect, it } from "@jest/globals";
import { openApiDocument } from "../../src/docs/openapi";
import { createSchoolSchema, listSchoolsSchema } from "../../src/modules/schools/schools.schemas";

function sortFieldNames(names: string[]): string[] {
  const copy = [...names];
  copy.sort((a, b) => a.localeCompare(b));
  return copy;
}

function readSchoolRequestRequired(): string[] {
  const schema = openApiDocument.components?.schemas?.SchoolRequest;
  if (!schema || typeof schema !== "object" || !("required" in schema)) {
    return [];
  }
  const req = (schema as { required?: unknown }).required;
  if (!Array.isArray(req)) {
    return [];
  }
  return req.filter((item): item is string => typeof item === "string");
}

function readSchoolRequestPropertyKeys(): string[] {
  const schema = openApiDocument.components?.schemas?.SchoolRequest;
  if (!schema || typeof schema !== "object" || !("properties" in schema)) {
    return [];
  }
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== "object") {
    return [];
  }
  return Object.keys(props).filter((k) => typeof k === "string");
}

describe("contrato OpenAPI — escolas", () => {
  it("expoe /api/schools GET e POST com seguranca bearer", () => {
    const paths = openApiDocument.paths;
    const schools = paths["/api/schools"];
    expect(schools?.get).toBeDefined();
    expect(schools?.post).toBeDefined();

    const getOp = schools?.get;
    const postOp = schools?.post;
    expect(getOp && typeof getOp === "object" && "security" in getOp ? getOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
    expect(postOp && typeof postOp === "object" && "security" in postOp ? postOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it("SchoolRequest required alinha com createSchoolSchema", () => {
    const specRequired = sortFieldNames(readSchoolRequestRequired());
    const zodRequired = sortFieldNames(
      Object.entries(createSchoolSchema.shape)
        .filter(([, field]) => !field.isOptional())
        .map(([key]) => key),
    );
    expect(specRequired).toEqual(zodRequired);
  });

  it("SchoolRequest properties cobrem os mesmos campos que createSchoolSchema", () => {
    const specProps = sortFieldNames(readSchoolRequestPropertyKeys());
    const zodKeys = sortFieldNames(Object.keys(createSchoolSchema.shape));
    expect(specProps).toEqual(zodKeys);
  });

  it("GET /api/schools declara os mesmos parametros opcionais que listSchoolsSchema", () => {
    const getOp = openApiDocument.paths["/api/schools"]?.get;
    expect(getOp && typeof getOp === "object" && "parameters" in getOp).toBe(true);
    if (!getOp || typeof getOp !== "object" || !("parameters" in getOp)) {
      throw new Error("OpenAPI: GET /api/schools sem parameters");
    }
    const rawParams = (getOp as unknown as { parameters?: readonly { name?: string }[] }).parameters ?? [];
    const namesFromOpenApi = sortFieldNames(
      rawParams.map((p) => p.name).filter((n): n is string => typeof n === "string"),
    );
    const namesFromZod = sortFieldNames(Object.keys(listSchoolsSchema.shape));
    expect(namesFromOpenApi).toEqual(namesFromZod);
  });

  it("POST 201 referencia IdResponse", () => {
    const post = openApiDocument.paths["/api/schools"]?.post;
    expect(post).toBeDefined();
    expect(post && typeof post === "object" && "responses" in post).toBe(true);
    const responses = (post as { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> })
      .responses;
    const ref = responses?.["201"]?.content?.["application/json"]?.schema;
    expect(ref).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });
});
