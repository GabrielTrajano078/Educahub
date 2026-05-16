export type HttpError = Error & { statusCode: number };

export function createHttpError(message: string, statusCode: number): HttpError {
  return Object.assign(new Error(message), { statusCode });
}

export function getHttpStatusCode(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }
  const code = (err as { statusCode?: unknown }).statusCode;
  if (typeof code !== "number" || !Number.isInteger(code) || code < 400 || code > 599) {
    return undefined;
  }
  return code;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Erro interno do servidor.";
}
