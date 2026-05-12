import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { app } from "../../src/app";
import { env } from "../../src/config/env";
import * as access from "../../src/lib/access";
import { ClassroomModel } from "../../src/modules/classes/classroom.model";

jest.mock("../../src/modules/classes/classroom.model", () => ({
  ClassroomModel: {
    find: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../src/lib/access", () => ({
  canAccessSchool: jest.fn(),
}));

const validOid = "507f1f77bcf86cd799439011";
const otherOid = "507f1f77bcf86cd799439012";

type Role = "admin" | "professor" | "coordenador" | "gestor";
type AsyncMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

function asAsyncMock(fn: unknown): AsyncMock {
  return fn as AsyncMock;
}

function bearer(role: Role, payload: { schoolId?: string | null; classroomIds?: string[]; municipalityCode?: string | null } = {}): string {
  const token = jwt.sign(
    {
      id: "507f191e810c19729de860ea",
      role,
      schoolId: payload.schoolId ?? null,
      classroomIds: payload.classroomIds ?? [],
      municipalityCode: payload.municipalityCode ?? null,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  return `Bearer ${token}`;
}

function mockClassroomFindReturns(rows: unknown[]): void {
  const lean = jest.fn<() => Promise<unknown[]>>().mockResolvedValue(rows);
  const sort = jest.fn().mockReturnValue({ lean });
  (ClassroomModel.find as jest.Mock).mockReturnValue({ sort });
}

function mockClassroomFindChain(rows: unknown[]): { sort: jest.Mock; lean: jest.Mock } {
  const lean = jest.fn<() => Promise<unknown[]>>().mockResolvedValue(rows);
  const sort = jest.fn().mockReturnValue({ lean });
  (ClassroomModel.find as jest.Mock).mockReturnValue({ sort });
  return { sort, lean };
}

describe("POST /api/classes", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    asAsyncMock(ClassroomModel.create).mockReset();
  });

  it("401 sem Authorization", async () => {
    const res = await request(app).post("/api/classes").send({
      schoolId: validOid,
      name: "5º Ano A",
      grade: "5",
    });

    expect(res.status).toBe(401);
  });

  it("403 para professor", async () => {
    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("professor", { schoolId: validOid, classroomIds: [validOid] }))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Acesso negado para este perfil." });
  });

  it("400 quando corpo invalido (Zod)", async () => {
    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "   ",
        grade: "6",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("403 quando canAccessSchool nega", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("gestor", { municipalityCode: "2304400" }))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Acesso negado a esta escola." });
  });

  it("409 em violacao de unicidade (codigo 11000)", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    asAsyncMock(ClassroomModel.create).mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Já existe turma com este nome para a escola informada." });
  });

  it("500 quando create falha com codigo diferente de duplicidade", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    asAsyncMock(ClassroomModel.create).mockRejectedValue({ code: 11001 });

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });

  it("500 quando create falha com valor primitivo", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    asAsyncMock(ClassroomModel.create).mockRejectedValue("falha persistencia");

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });

  it("500 quando create falha com funcao que possui codigo de duplicidade", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    const errorWithCode = Object.assign(() => undefined, { code: 11000 });
    asAsyncMock(ClassroomModel.create).mockRejectedValue(errorWithCode);

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });

  it("500 quando create falha com erro que nao e duplicata", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    asAsyncMock(ClassroomModel.create).mockRejectedValue(new Error("falha persistencia"));

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });

  it("201 para coordenador autorizado", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    const createdId = new Types.ObjectId();
    asAsyncMock(ClassroomModel.create).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("coordenador", { schoolId: validOid }))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: String(createdId) });
  });

  it("201 e retorna id quando criacao ok", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    const createdId = new Types.ObjectId();
    asAsyncMock(ClassroomModel.create).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/classes")
      .set("Authorization", bearer("admin"))
      .send({
        schoolId: validOid,
        name: "5º Ano A",
        grade: "5",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: String(createdId) });
    expect(ClassroomModel.create).toHaveBeenCalledWith({
      schoolId: validOid,
      name: "5º Ano A",
      grade: "5",
    });
  });
});

describe("GET /api/classes", () => {
  beforeEach(() => {
    (ClassroomModel.find as jest.Mock).mockReset();
  });

  it("401 sem Authorization", async () => {
    const res = await request(app).get("/api/classes");
    expect(res.status).toBe(401);
  });

  it("200 com lista vazia para admin", async () => {
    const { sort } = mockClassroomFindChain([]);

    const res = await request(app).get("/api/classes").set("Authorization", bearer("admin"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(ClassroomModel.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it("200 admin aplica filtros e escapa nameContains", async () => {
    mockClassroomFindReturns([]);

    const res = await request(app)
      .get("/api/classes")
      .query({ schoolId: validOid, grade: "9", nameContains: "5.*A" })
      .set("Authorization", bearer("admin"));

    expect(res.status).toBe(200);
    expect(ClassroomModel.find).toHaveBeenCalledWith({
      schoolId: validOid,
      grade: "9",
      name: { $regex: String.raw`5\.\*A`, $options: "i" },
    });
  });

  it("500 quando consulta de turmas falha", async () => {
    (ClassroomModel.find as jest.Mock).mockImplementation(() => {
      throw new Error("falha consulta");
    });

    const res = await request(app).get("/api/classes").set("Authorization", bearer("admin"));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });

  it("403 professor sem escola vinculada", async () => {
    const res = await request(app)
      .get("/api/classes")
      .set("Authorization", bearer("professor", { schoolId: null, classroomIds: [validOid] }));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Usuario sem escola vinculada." });
  });

  it("200 professor sem turmas atribuidas retorna lista vazia sem consultar turmas", async () => {
    const res = await request(app)
      .get("/api/classes")
      .set("Authorization", bearer("professor", { schoolId: validOid, classroomIds: [] }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(ClassroomModel.find).not.toHaveBeenCalled();
  });

  it("200 professor consulta apenas escola e turmas atribuidas validas", async () => {
    mockClassroomFindReturns([]);

    const res = await request(app)
      .get("/api/classes")
      .query({ schoolId: otherOid, grade: "5" })
      .set("Authorization", bearer("professor", { schoolId: validOid, classroomIds: [validOid, "invalid"] }));

    expect(res.status).toBe(200);
    const query = (ClassroomModel.find as jest.Mock).mock.calls[0]?.[0] as {
      schoolId?: string;
      grade?: string;
      _id?: { $in?: Types.ObjectId[] };
    };
    expect(query.schoolId).toBe(validOid);
    expect(query.grade).toBe("5");
    expect(query._id?.$in?.map(String)).toEqual([validOid]);
  });

  it("403 coordenador sem escola vinculada", async () => {
    const res = await request(app)
      .get("/api/classes")
      .set("Authorization", bearer("coordenador", { schoolId: null }));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Usuario sem escola vinculada." });
  });

  it("200 coordenador consulta apenas a propria escola", async () => {
    mockClassroomFindReturns([]);

    const res = await request(app)
      .get("/api/classes")
      .query({ schoolId: otherOid })
      .set("Authorization", bearer("coordenador", { schoolId: validOid }));

    expect(res.status).toBe(200);
    expect(ClassroomModel.find).toHaveBeenCalledWith({ schoolId: validOid });
  });
});
