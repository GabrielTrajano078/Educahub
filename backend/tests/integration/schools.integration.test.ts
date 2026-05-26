import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { app } from "../../src/app";
import { env } from "../../src/config/env";
import { SchoolModel } from "../../src/modules/schools/school.model";

jest.mock("../../src/modules/schools/school.model", () => ({
  SchoolModel: {
    find: jest.fn(),
    create: jest.fn(),
  },
}));

const validOid = "507f1f77bcf86cd799439011";

type Role = "admin" | "gestor" | "professor";
type AsyncMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

function asAsyncMock(fn: unknown): AsyncMock {
  return fn as AsyncMock;
}

function bearer(role: Role, payload: { municipalityCode?: string | null } = {}): string {
  const token = jwt.sign(
    {
      id: validOid,
      role,
      municipalityCode: payload.municipalityCode ?? null,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  return `Bearer ${token}`;
}

function mockSchoolFindReturns(rows: unknown[]): { sort: jest.Mock; lean: jest.Mock } {
  const lean = jest.fn<() => Promise<unknown[]>>().mockResolvedValue(rows);
  const sort = jest.fn().mockReturnValue({ lean });
  (SchoolModel.find as jest.Mock).mockReturnValue({ sort });
  return { sort, lean };
}

describe("GET /api/schools", () => {
  beforeEach(() => {
    (SchoolModel.find as jest.Mock).mockReset();
  });

  it("401 sem Authorization", async () => {
    const res = await request(app).get("/api/schools");
    expect(res.status).toBe(401);
  });

  it("403 para professor", async () => {
    const res = await request(app).get("/api/schools").set("Authorization", bearer("professor"));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Acesso negado para este perfil." });
  });

  it("403 para gestor sem municipio vinculado", async () => {
    const res = await request(app).get("/api/schools").set("Authorization", bearer("gestor", { municipalityCode: null }));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Gestor sem municipio vinculado." });
  });

  it("200 admin lista escolas sem filtro de municipio", async () => {
    const rows = [{ _id: validOid, name: "EMEF Centro", normalizedName: "EMEF CENTRO" }];
    const { sort } = mockSchoolFindReturns(rows);

    const res = await request(app).get("/api/schools").set("Authorization", bearer("admin"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(SchoolModel.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ normalizedName: 1 });
  });

  it("200 gestor restringe consulta ao municipio do perfil", async () => {
    mockSchoolFindReturns([]);

    const res = await request(app)
      .get("/api/schools")
      .set("Authorization", bearer("gestor", { municipalityCode: "2304400" }));

    expect(res.status).toBe(200);
    expect(SchoolModel.find).toHaveBeenCalledWith({ municipalityCode: "2304400" });
  });

  it("200 aplica nameContains com regex escapado em normalizedName", async () => {
    mockSchoolFindReturns([]);

    const res = await request(app)
      .get("/api/schools")
      .query({ nameContains: "EMEF (centro)" })
      .set("Authorization", bearer("admin"));

    expect(res.status).toBe(200);
    expect(SchoolModel.find).toHaveBeenCalledWith({
      normalizedName: { $regex: "EMEF \\(CENTRO\\)", $options: "i" },
    });
  });

  it("400 quando nameContains excede limite", async () => {
    const res = await request(app)
      .get("/api/schools")
      .query({ nameContains: "x".repeat(201) })
      .set("Authorization", bearer("admin"));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("200 gestor combina municipio do perfil com nameContains", async () => {
    mockSchoolFindReturns([]);

    const res = await request(app)
      .get("/api/schools")
      .query({ nameContains: "EMEF" })
      .set("Authorization", bearer("gestor", { municipalityCode: "2304400" }));

    expect(res.status).toBe(200);
    expect(SchoolModel.find).toHaveBeenCalledWith({
      municipalityCode: "2304400",
      normalizedName: { $regex: "EMEF", $options: "i" },
    });
  });
});

describe("POST /api/schools", () => {
  beforeEach(() => {
    asAsyncMock(SchoolModel.create).mockReset();
  });

  it("401 sem Authorization", async () => {
    const res = await request(app).post("/api/schools").send({ name: "EMEF Centro" });
    expect(res.status).toBe(401);
  });

  it("403 para professor", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("professor"))
      .send({ name: "EMEF Centro" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Acesso negado para este perfil." });
  });

  it("400 quando corpo invalido (Zod)", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "A" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("403 para gestor sem municipio vinculado", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("gestor", { municipalityCode: null }))
      .send({ name: "EMEF Centro" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Gestor sem municipio vinculado." });
  });

  it("403 para gestor com municipio divergente do perfil", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("gestor", { municipalityCode: "2304400" }))
      .send({ name: "EMEF Centro", municipalityCode: "3550308" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Municipio divergente do perfil." });
  });

  it("201 admin cria escola com campos opcionais", async () => {
    const createdId = new Types.ObjectId(validOid);
    asAsyncMock(SchoolModel.create).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({
        name: "EMEF Centro",
        city: "Fortaleza",
        municipalityCode: "2304400",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: validOid });
    expect(SchoolModel.create).toHaveBeenCalledWith({
      name: "EMEF Centro",
      normalizedName: "EMEF CENTRO",
      city: "Fortaleza",
      municipalityCode: "2304400",
    });
  });

  it("201 persiste normalizedName derivado de name com acentos", async () => {
    const createdId = new Types.ObjectId(validOid);
    asAsyncMock(SchoolModel.create).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "Teste João", municipalityCode: "2304400" });

    expect(res.status).toBe(201);
    expect(SchoolModel.create).toHaveBeenCalledWith({
      name: "Teste João",
      normalizedName: "TESTE JOAO",
      municipalityCode: "2304400",
    });
  });

  it("409 em duplicata municipalityCode + normalizedName", async () => {
    asAsyncMock(SchoolModel.create).mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "EMEF Centro", municipalityCode: "2304400" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Ja existe escola com este nome no municipio informado." });
  });

  it("400 rejeita normalizedName no body", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "EMEF Centro", normalizedName: "EMEF CENTRO" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("201 gestor preenche municipalityCode do perfil quando omitido", async () => {
    const createdId = new Types.ObjectId(validOid);
    asAsyncMock(SchoolModel.create).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("gestor", { municipalityCode: "2304400" }))
      .send({ name: "EMEF Centro", city: "Fortaleza" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: validOid });
    expect(SchoolModel.create).toHaveBeenCalledWith({
      name: "EMEF Centro",
      normalizedName: "EMEF CENTRO",
      city: "Fortaleza",
      municipalityCode: "2304400",
    });
  });

  it("201 gestor aceita municipalityCode igual ao perfil", async () => {
    const createdId = new Types.ObjectId(validOid);
    asAsyncMock(SchoolModel.create).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("gestor", { municipalityCode: "2304400" }))
      .send({ name: "EMEF Sul", municipalityCode: "2304400" });

    expect(res.status).toBe(201);
    expect(SchoolModel.create).toHaveBeenCalledWith({
      name: "EMEF Sul",
      normalizedName: "EMEF SUL",
      municipalityCode: "2304400",
    });
  });

  it("400 quando municipalityCode nao tem 7 digitos", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "EMEF Centro", municipalityCode: "23044" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("400 quando corpo inclui campos extras (strict)", async () => {
    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "EMEF Centro", extraField: true });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("500 quando create falha", async () => {
    asAsyncMock(SchoolModel.create).mockRejectedValue(new Error("falha persistencia"));

    const res = await request(app)
      .post("/api/schools")
      .set("Authorization", bearer("admin"))
      .send({ name: "EMEF Centro" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });
});
