import { describe, expect, it, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod";
import { handleExpressError } from "../../src/lib/express-error-handler";
import { createHttpError } from "../../src/lib/http-error";

function mockResponse(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res as Response & { statusCode: number; body: unknown };
}

describe("handleExpressError", () => {
  const next = jest.fn() as NextFunction;
  const req = {} as Request;

  it("400 com issues para ZodError", () => {
    const res = mockResponse();
    const schema = z.object({ id: z.string().min(1) });
    let zodErr: ZodError | undefined;
    try {
      schema.parse({ id: "" });
    } catch (e) {
      zodErr = e as ZodError;
    }

    handleExpressError(zodErr, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      message: "Erro de validacao",
      issues: expect.any(Array),
    });
  });

  it("devolve statusCode e message para HttpError", () => {
    const res = mockResponse();
    handleExpressError(createHttpError("Prova nao encontrada.", 404), req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "Prova nao encontrada." });
  });

  it("500 para erro generico sem statusCode", () => {
    const res = mockResponse();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    handleExpressError(new Error("boom"), req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
    consoleSpy.mockRestore();
  });
});
