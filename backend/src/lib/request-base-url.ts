import type { Request } from "express";

/** URL base da requisição (protocolo + host) para montar links públicos de arquivos. */
export function getRequestBaseUrl(req: Request): string {
  const host = req.get("host");
  return host ? `${req.protocol}://${host}` : `${req.protocol}://localhost`;
}
