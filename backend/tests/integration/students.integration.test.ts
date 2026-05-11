import request from "supertest";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { app } from "../../src/app";
import { env } from "../../src/config/env";
import * as access from "../../src/lib/access";
import { ClassroomModel } from "../../src/modules/classes/classroom.model";
import { AnswerSheetModel } from "../../src/modules/results/answer-sheet.model";
import { AnswerSheetScanModel } from "../../src/modules/results/answer-sheet-scan.model";
import { ResultModel } from "../../src/modules/results/result.model";
import { StudentModel } from "../../src/modules/students/student.model";

jest.mock("../../src/modules/students/student.model", () => ({
  StudentModel: {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock("../../src/modules/classes/classroom.model", () => ({
  ClassroomModel: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock("../../src/modules/results/result.model", () => ({
  ResultModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/modules/results/answer-sheet.model", () => ({
  AnswerSheetModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/modules/results/answer-sheet-scan.model", () => ({
  AnswerSheetScanModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/lib/access", () => ({
  canAccessSchool: jest.fn(),
  canAccessClassroom: jest.fn(),
  canAccessStudent: jest.fn(),
}));

const validOid = "507f1f77bcf86cd799439011";
const otherOid = "507f1f77bcf86cd799439012";

function bearerAdmin(): string {
  const token = jwt.sign({ id: validOid, role: "admin" }, env.JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

function bearerProfessor(payload: {
  schoolId: string | null;
  classroomIds: string[];
}): string {
  const token = jwt.sign(
    {
      id: "507f191e810c19729de860ea",
      role: "professor",
      schoolId: payload.schoolId,
      classroomIds: payload.classroomIds,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  return `Bearer ${token}`;
}

function mockStudentFindReturns(rows: unknown[]): void {
  const lean = jest.fn().mockResolvedValue(rows);
  const sort = jest.fn().mockReturnValue({ lean });
  (StudentModel.find as jest.Mock).mockReturnValue({ sort });
}

function mockClassroomById(schoolId: string): void {
  const lean = jest.fn().mockResolvedValue({ schoolId: new Types.ObjectId(schoolId) });
  (ClassroomModel.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({ lean }),
  });
}

function mockClassroomsForGrade(ids: Types.ObjectId[]): void {
  const rows = ids.map((id) => ({ _id: id }));
  (ClassroomModel.find as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(rows),
    }),
  });
}

describe("POST /api/students", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    jest.mocked(access.canAccessClassroom).mockReset();
    (StudentModel.create as jest.Mock).mockReset();
    (ClassroomModel.findById as jest.Mock).mockReset();
  });

  it("401 sem Authorization", async () => {
    const res = await request(app).post("/api/students").send({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "Nome",
      registrationCode: "REG-1",
    });
    expect(res.status).toBe(401);
  });

  it("400 quando corpo invalido (Zod)", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "x",
        registrationCode: "ab",
      });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("403 quando canAccessSchool nega", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Acesso negado a esta escola." });
  });

  it("403 professor quando canAccessClassroom nega", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    jest.mocked(access.canAccessClassroom).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/students")
      .set(
        "Authorization",
        bearerProfessor({ schoolId: validOid, classroomIds: [validOid] }),
      )
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Acesso negado a esta turma." });
  });

  it("404 quando turma nao existe", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    const lean = jest.fn().mockResolvedValue(null);
    (ClassroomModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean }),
    });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Turma nao encontrada." });
  });

  it("400 quando turma nao pertence a escola informada", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(otherOid);

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "A turma nao pertence a escola informada." });
  });

  it("409 em violacao de unicidade (codigo 11000)", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(validOid);
    (StudentModel.create as jest.Mock).mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-DUP",
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Já existe aluno com este código de matrícula." });
  });

  it("500 quando create falha com erro que nao e duplicata", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(validOid);
    (StudentModel.create as jest.Mock).mockRejectedValue(new Error("falha persistencia"));

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-ERR",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor." });
  });

  it("201 e retorna id quando criacao ok", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(validOid);
    const createdId = new Types.ObjectId();
    (StudentModel.create as jest.Mock).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-NEW",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: String(createdId) });
  });
});

describe("GET /api/students", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    (ClassroomModel.find as jest.Mock).mockReset();
    (StudentModel.find as jest.Mock).mockReset();
  });

  it("200 com lista vazia para admin", async () => {
    mockStudentFindReturns([]);
    const res = await request(app).get("/api/students").set("Authorization", bearerAdmin());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("403 professor sem escola vinculada", async () => {
    const res = await request(app)
      .get("/api/students")
      .set("Authorization", bearerProfessor({ schoolId: null, classroomIds: [validOid] }));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Usuario sem escola vinculada." });
  });

  it("200 professor sem turmas atribuidas retorna lista vazia sem consultar alunos", async () => {
    const res = await request(app)
      .get("/api/students")
      .set("Authorization", bearerProfessor({ schoolId: validOid, classroomIds: [] }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(StudentModel.find).not.toHaveBeenCalled();
  });

  it("200 professor com turma no filtro que nao esta atribuida a ele", async () => {
    const res = await request(app)
      .get("/api/students")
      .query({ classroomId: otherOid })
      .set("Authorization", bearerProfessor({ schoolId: validOid, classroomIds: [validOid] }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(StudentModel.find).not.toHaveBeenCalled();
  });

  it("200 admin com grade e schoolId aplica filtro de turmas do ano", async () => {
    const gradeClassId = new Types.ObjectId();
    mockClassroomsForGrade([gradeClassId]);
    mockStudentFindReturns([]);

    const res = await request(app)
      .get("/api/students")
      .query({ grade: "5", schoolId: validOid })
      .set("Authorization", bearerAdmin());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(ClassroomModel.find).toHaveBeenCalledWith({ grade: "5", schoolId: validOid });
    expect(StudentModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: validOid,
        classroomId: { $in: [gradeClassId] },
      }),
    );
  });
});

describe("DELETE /api/students/:id", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessStudent).mockReset();
    (StudentModel.findById as jest.Mock).mockReset();
    (StudentModel.deleteOne as jest.Mock).mockReset();
    (ResultModel.deleteMany as jest.Mock).mockReset();
    (AnswerSheetModel.deleteMany as jest.Mock).mockReset();
    (AnswerSheetScanModel.deleteMany as jest.Mock).mockReset();
  });

  it("400 com id invalido", async () => {
    const res = await request(app).delete("/api/students/nao-e-oid").set("Authorization", bearerAdmin());
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "ID invalido." });
  });

  it("204 quando exclusao autorizada e aluno existe", async () => {
    jest.mocked(access.canAccessStudent).mockResolvedValue(true);
    const lean = jest.fn().mockResolvedValue({ _id: validOid });
    (StudentModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean }),
    });

    const deleteOrder: string[] = [];
    (ResultModel.deleteMany as jest.Mock).mockImplementation(async () => {
      deleteOrder.push("ResultModel");
      return {};
    });
    (AnswerSheetScanModel.deleteMany as jest.Mock).mockImplementation(async () => {
      deleteOrder.push("AnswerSheetScanModel");
      return {};
    });
    (AnswerSheetModel.deleteMany as jest.Mock).mockImplementation(async () => {
      deleteOrder.push("AnswerSheetModel");
      return {};
    });
    (StudentModel.deleteOne as jest.Mock).mockImplementation(async () => {
      deleteOrder.push("StudentModel");
      return { deletedCount: 1 };
    });

    const res = await request(app).delete(`/api/students/${validOid}`).set("Authorization", bearerAdmin());
    expect(res.status).toBe(204);

    const studentId = new Types.ObjectId(validOid);
    expect(ResultModel.deleteMany).toHaveBeenCalledWith({ studentId });
    expect(AnswerSheetScanModel.deleteMany).toHaveBeenCalledWith({ studentId });
    expect(AnswerSheetModel.deleteMany).toHaveBeenCalledWith({ studentId });
    expect(StudentModel.deleteOne).toHaveBeenCalledWith({ _id: studentId });
    expect(deleteOrder).toEqual([
      "ResultModel",
      "AnswerSheetScanModel",
      "AnswerSheetModel",
      "StudentModel",
    ]);
  });
});
