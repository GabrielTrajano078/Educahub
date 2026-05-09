import { openApiDocument } from "../../src/docs/openapi";
import { createStudentSchema, listStudentsSchema } from "../../src/modules/students/students.schemas";

function sortFieldNames(names: string[]): string[] {
  const copy = [...names];
  copy.sort((a, b) => a.localeCompare(b));
  return copy;
}

function readStudentRequestRequired(): string[] {
  const schema = openApiDocument.components?.schemas?.StudentRequest;
  if (!schema || typeof schema !== "object" || !("required" in schema)) {
    return [];
  }
  const req = (schema as { required?: unknown }).required;
  if (!Array.isArray(req)) {
    return [];
  }
  return req.filter((item): item is string => typeof item === "string");
}

function readStudentRequestPropertyKeys(): string[] {
  const schema = openApiDocument.components?.schemas?.StudentRequest;
  if (!schema || typeof schema !== "object" || !("properties" in schema)) {
    return [];
  }
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== "object") {
    return [];
  }
  return Object.keys(props).filter((k) => typeof k === "string");
}

describe("contrato OpenAPI — alunos", () => {
  it("expoe /api/students GET e POST com seguranca bearer", () => {
    const paths = openApiDocument.paths;
    const students = paths["/api/students"];
    expect(students?.get).toBeDefined();
    expect(students?.post).toBeDefined();

    const getOp = students?.get;
    const postOp = students?.post;
    expect(getOp && typeof getOp === "object" && "security" in getOp ? getOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
    expect(postOp && typeof postOp === "object" && "security" in postOp ? postOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it("StudentRequest required alinha com createStudentSchema", () => {
    const specRequired = sortFieldNames(readStudentRequestRequired());
    const zodKeys = sortFieldNames(Object.keys(createStudentSchema.shape));
    expect(specRequired).toEqual(zodKeys);
  });

  it("StudentRequest properties cobrem os mesmos campos que createStudentSchema", () => {
    const specProps = sortFieldNames(readStudentRequestPropertyKeys());
    const zodKeys = sortFieldNames(Object.keys(createStudentSchema.shape));
    expect(specProps).toEqual(zodKeys);
  });

  it("GET /api/students declara os mesmos parametros opcionais que listStudentsSchema", () => {
    const getOp = openApiDocument.paths["/api/students"]?.get;
    expect(getOp && typeof getOp === "object" && "parameters" in getOp).toBe(true);
    if (!getOp || typeof getOp !== "object" || !("parameters" in getOp)) {
      throw new Error("OpenAPI: GET /api/students sem parameters");
    }
    const rawParams = (getOp as unknown as { parameters?: readonly { name?: string }[] }).parameters ?? [];
    const namesFromOpenApi = sortFieldNames(
      rawParams.map((p) => p.name).filter((n): n is string => typeof n === "string"),
    );
    const namesFromZod = sortFieldNames(Object.keys(listStudentsSchema.shape));
    expect(namesFromOpenApi).toEqual(namesFromZod);
  });

  it("POST 201 referencia IdResponse", () => {
    const post = openApiDocument.paths["/api/students"]?.post;
    expect(post).toBeDefined();
    expect(post && typeof post === "object" && "responses" in post).toBe(true);
    const responses = (post as { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> })
      .responses;
    const ref = responses?.["201"]?.content?.["application/json"]?.schema;
    expect(ref).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });
});
