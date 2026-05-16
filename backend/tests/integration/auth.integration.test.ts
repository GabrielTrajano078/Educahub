import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Types } from "mongoose";
import { app } from "../../src/app";
import { UserModel } from "../../src/modules/auth/user.model";

jest.mock("../../src/modules/auth/user.model", () => ({
  UserModel: {
    findOne: jest.fn(),
  },
}));

function mockFindOneLean(value: unknown): void {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(value);
  jest.mocked(UserModel.findOne).mockReturnValue({ lean } as unknown as ReturnType<typeof UserModel.findOne>);
}

function sampleUser(overrides: Partial<{ passwordHash: string | null }> = {}) {
  return {
    _id: new Types.ObjectId(),
    fullName: "Usuario Teste",
    email: "user@test.com",
    passwordHash: overrides.passwordHash ?? "",
    role: "admin" as const,
    schoolId: null,
    municipalityCode: null,
    classroomIds: [],
  };
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    (UserModel.findOne as jest.Mock).mockReset();
  });

  it("retorna 401 com mensagem padrao quando o usuario nao existe", async () => {
    mockFindOneLean(null);
    const res = await request(app).post("/api/auth/login").send({
      email: "missing@test.com",
      password: "qualquer",
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Credenciais invalidas." });
  });

  it("retorna 401 quando a senha esta incorreta", async () => {
    const hash = await bcrypt.hash("certa", 4);
    mockFindOneLean(sampleUser({ passwordHash: hash }));
    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "errada",
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Credenciais invalidas." });
  });

  it("retorna 401 quando passwordHash esta ausente (evita 500 no bcrypt)", async () => {
    mockFindOneLean(sampleUser({ passwordHash: null }));
    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "qualquer",
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Credenciais invalidas." });
  });

  it("retorna 400 com Erro de validacao quando o corpo e invalido", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nao-e-email",
      password: "",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Erro de validacao");
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("retorna 200 com token quando as credenciais estao corretas", async () => {
    const hash = await bcrypt.hash("secret", 4);
    mockFindOneLean(sampleUser({ passwordHash: hash }));
    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "secret",
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(10);
    expect(res.body.user).toMatchObject({
      email: "user@test.com",
      fullName: "Usuario Teste",
      role: "admin",
    });
  });

  it("retorna 401 quando bcrypt.compare rejeita", async () => {
    const hash = await bcrypt.hash("x", 4);
    mockFindOneLean(sampleUser({ passwordHash: hash }));
    const spy = jest
      .spyOn(bcrypt, "compare")
      .mockImplementation(() => Promise.reject(new Error("falha bcrypt")));
    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "x",
    });
    spy.mockRestore();
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Credenciais invalidas." });
  });
});
