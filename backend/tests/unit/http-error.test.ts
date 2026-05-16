import { describe, expect, it } from "@jest/globals";
import { createHttpError, getErrorMessage, getHttpStatusCode } from "../../src/lib/http-error";

describe("http-error", () => {
  it("createHttpError define statusCode no erro", () => {
    const err = createHttpError("Prova nao encontrada.", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Prova nao encontrada.");
    expect(err.statusCode).toBe(404);
  });

  it("getHttpStatusCode le statusCode de Object.assign", () => {
    const err = Object.assign(new Error("Aluno nao encontrado."), { statusCode: 404 });
    expect(getHttpStatusCode(err)).toBe(404);
  });

  it("getHttpStatusCode ignora codigos fora do intervalo HTTP de erro cliente/servidor", () => {
    expect(getHttpStatusCode(Object.assign(new Error("x"), { statusCode: 399 }))).toBeUndefined();
    expect(getHttpStatusCode(Object.assign(new Error("x"), { statusCode: 600 }))).toBeUndefined();
    expect(getHttpStatusCode(Object.assign(new Error("x"), { statusCode: "404" }))).toBeUndefined();
  });

  it("getErrorMessage usa message do Error", () => {
    expect(getErrorMessage(new Error("falha"))).toBe("falha");
  });

  it("getErrorMessage devolve fallback para valor nao-Error", () => {
    expect(getErrorMessage("oops")).toBe("Erro interno do servidor.");
  });
});
