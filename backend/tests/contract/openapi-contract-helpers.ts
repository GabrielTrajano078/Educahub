import { openApiDocument } from "../../src/docs/openapi";
import type { ZodObject, ZodRawShape } from "zod";

type HttpMethod = "get" | "post" | "patch" | "put" | "delete";
type ParamLocation = "query" | "path" | "header";

type OpenApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
};

type OpenApiOperation = {
  security?: unknown;
  parameters?: readonly OpenApiParameter[];
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
  requestBody?: {
    content?: Record<string, { schema?: unknown }>;
  };
};

type JsonObject = Record<string, unknown>;

/** OpenAPI exportado com `as const` — indexação dinâmica via Record para testes de contrato. */
function openApiSchemas(): Record<string, unknown> {
  const schemas = openApiDocument.components?.schemas;
  if (!schemas || typeof schemas !== "object") {
    return {};
  }
  return schemas;
}

function openApiPaths(): Record<string, unknown> {
  return openApiDocument.paths;
}

function readComponentSchema(componentName: string): JsonObject | undefined {
  const schema = openApiSchemas()[componentName];
  if (!schema || typeof schema !== "object") {
    return undefined;
  }
  return schema as JsonObject;
}

export function sortFieldNames(names: string[]): string[] {
  const copy = [...names];
  copy.sort((a, b) => a.localeCompare(b));
  return copy;
}

function isZodFieldOptional(field: unknown): boolean {
  const candidate = field as { safeParse?: (data: unknown) => { success: boolean } };
  return candidate.safeParse?.(undefined).success === true;
}

export function zodRequiredKeys(schema: ZodObject<ZodRawShape>): string[] {
  return sortFieldNames(
    Object.entries(schema.shape)
      .filter(([, field]) => !isZodFieldOptional(field))
      .map(([key]) => key),
  );
}

export function zodShapeKeys(schema: ZodObject<ZodRawShape>): string[] {
  return sortFieldNames(Object.keys(schema.shape));
}

export function readComponentSchemaRequired(componentName: string): string[] {
  const schema = readComponentSchema(componentName);
  if (!schema || !("required" in schema)) {
    return [];
  }
  const req = schema.required;
  if (!Array.isArray(req)) {
    return [];
  }
  return sortFieldNames(req.filter((item): item is string => typeof item === "string"));
}

export function readComponentSchemaPropertyKeys(componentName: string): string[] {
  const schema = readComponentSchema(componentName);
  if (!schema || !("properties" in schema)) {
    return [];
  }
  const props = schema.properties;
  if (!props || typeof props !== "object") {
    return [];
  }
  return sortFieldNames(Object.keys(props).filter((k) => typeof k === "string"));
}

function readOperation(path: string, method: HttpMethod): OpenApiOperation | undefined {
  const pathItem = openApiPaths()[path];
  if (!pathItem || typeof pathItem !== "object") {
    return undefined;
  }
  const op = pathItem[method as keyof typeof pathItem];
  if (!op || typeof op !== "object") {
    return undefined;
  }
  return op;
}

export function readOperationSecurity(path: string, method: HttpMethod): unknown {
  return readOperation(path, method)?.security;
}

export function readOperationParameterNames(
  path: string,
  method: HttpMethod,
  location: ParamLocation,
): string[] {
  const params = readOperation(path, method)?.parameters ?? [];
  return sortFieldNames(
    params
      .filter((p) => p.in === location)
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string"),
  );
}

export function readOperationRequiredQueryParamNames(path: string, method: HttpMethod): string[] {
  const params = readOperation(path, method)?.parameters ?? [];
  return sortFieldNames(
    params
      .filter((p) => p.in === "query" && p.required === true)
      .map((p) => p.name)
      .filter((n): n is string => typeof n === "string"),
  );
}

export function readPost201ResponseSchema(path: string): unknown {
  const post = readOperation(path, "post");
  return post?.responses?.["201"]?.content?.["application/json"]?.schema;
}

export function readRequestBodySchemaRef(path: string, method: HttpMethod): unknown {
  const op = readOperation(path, method);
  return op?.requestBody?.content?.["application/json"]?.schema;
}

export const BEARER_SECURITY = [{ bearerAuth: [] }] as const;
