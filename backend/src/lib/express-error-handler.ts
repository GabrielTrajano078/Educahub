import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { getErrorMessage, getHttpStatusCode } from "./http-error";

export function handleExpressError(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Erro de validacao", issues: err.issues });
    return;
  }

  const statusCode = getHttpStatusCode(err);
  if (statusCode !== undefined) {
    res.status(statusCode).json({ message: getErrorMessage(err) });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor." });
}
