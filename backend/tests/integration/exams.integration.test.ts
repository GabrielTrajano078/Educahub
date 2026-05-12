import request from "supertest";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { app } from "../../src/app";
import { env } from "../../src/config/env";
import * as access from "../../src/lib/access";
import { ClassroomModel } from "../../src/modules/classes/classroom.model";
import { ExamModel } from "../../src/modules/exams/exam.model";
import { ExamFileModel } from "../../src/modules/exams/exam-file.model";
import { OfficialAnswerKeyModel } from "../../src/modules/exams/official-answer-key.model";
import { QuestionModel } from "../../src/modules/questions/question.model";
import { AnswerSheetModel } from "../../src/modules/results/answer-sheet.model";
import { AnswerSheetScanModel } from "../../src/modules/results/answer-sheet-scan.model";
import { ResultModel } from "../../src/modules/results/result.model";

jest.mock("../../src/modules/exams/exam.model", () => ({
  ExamModel: {
    findById: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock("../../src/modules/questions/question.model", () => ({
  QuestionModel: {
    find: jest.fn(),
  },
}));

jest.mock("../../src/modules/classes/classroom.model", () => ({
  ClassroomModel: {
    findById: jest.fn(),
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

jest.mock("../../src/modules/exams/official-answer-key.model", () => ({
  OfficialAnswerKeyModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/modules/exams/exam-file.model", () => ({
  ExamFileModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/lib/access", () => ({
  canAccessClassroom: jest.fn(),
  canAccessSchool: jest.fn(),
  canAccessStudent: jest.fn(),
}));

const validOid = "507f1f77bcf86cd799439011";
const classroomOid = "507f1f77bcf86cd799439012";
const questionOneOid = "507f1f77bcf86cd799439013";
const questionTwoOid = "507f1f77bcf86cd799439014";

function bearerAdmin(): string {
  const token = jwt.sign({ id: validOid, role: "admin" }, env.JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

function mockExam(): void {
  (ExamModel.findById as jest.Mock).mockReturnValue({
    lean: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(validOid),
      schoolId: new Types.ObjectId(validOid),
      classroomId: new Types.ObjectId(classroomOid),
      sourceType: "QUESTION_BANK",
      status: "DRAFT",
      questions: [],
    }),
  });
}

describe("PATCH /api/exams/:id", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    jest.mocked(access.canAccessClassroom).mockReset();
    (ExamModel.findById as jest.Mock).mockReset();
    (ExamModel.updateOne as jest.Mock).mockReset();
    (ClassroomModel.findById as jest.Mock).mockReset();
    (QuestionModel.find as jest.Mock).mockReset();
  });

  it("400 com id invalido", async () => {
    const res = await request(app).patch("/api/exams/nao-e-oid").set("Authorization", bearerAdmin()).send({ title: "Nova prova" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Erro de validacao", issues: expect.any(Array) });
  });

  it("200 atualiza dados e questoes da prova", async () => {
    mockExam();
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    jest.mocked(access.canAccessClassroom).mockResolvedValue(true);
    (ClassroomModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ schoolId: new Types.ObjectId(validOid) }),
      }),
    });
    (QuestionModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: questionOneOid }, { _id: questionTwoOid }]),
      }),
    });
    (ExamModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

    const res = await request(app)
      .patch(`/api/exams/${validOid}`)
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: classroomOid,
        title: "Prova editada",
        discipline: "LP",
        grade: "5",
        framework: "SAEB",
        examType: "SIMULADO_1",
        questionIds: [questionOneOid, questionTwoOid],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: validOid });
    expect(ExamModel.updateOne).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(validOid) },
      {
        $set: expect.objectContaining({
          title: "Prova editada",
          questionCount: 2,
          questions: [
            { questionId: new Types.ObjectId(questionOneOid), order: 1 },
            { questionId: new Types.ObjectId(questionTwoOid), order: 2 },
          ],
        }),
      },
    );
  });
});

describe("DELETE /api/exams/:id", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    jest.mocked(access.canAccessClassroom).mockReset();
    (ExamModel.findById as jest.Mock).mockReset();
    (ExamModel.deleteOne as jest.Mock).mockReset();
    (ResultModel.deleteMany as jest.Mock).mockReset();
    (AnswerSheetScanModel.deleteMany as jest.Mock).mockReset();
    (AnswerSheetModel.deleteMany as jest.Mock).mockReset();
    (OfficialAnswerKeyModel.deleteMany as jest.Mock).mockReset();
    (ExamFileModel.deleteMany as jest.Mock).mockReset();
  });

  it("204 remove prova e dados vinculados", async () => {
    mockExam();
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    (ResultModel.deleteMany as jest.Mock).mockResolvedValue({});
    (AnswerSheetScanModel.deleteMany as jest.Mock).mockResolvedValue({});
    (AnswerSheetModel.deleteMany as jest.Mock).mockResolvedValue({});
    (OfficialAnswerKeyModel.deleteMany as jest.Mock).mockResolvedValue({});
    (ExamFileModel.deleteMany as jest.Mock).mockResolvedValue({});
    (ExamModel.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

    const res = await request(app).delete(`/api/exams/${validOid}`).set("Authorization", bearerAdmin());
    expect(res.status).toBe(204);

    const examId = new Types.ObjectId(validOid);
    expect(ResultModel.deleteMany).toHaveBeenCalledWith({ examId });
    expect(AnswerSheetScanModel.deleteMany).toHaveBeenCalledWith({ examId });
    expect(AnswerSheetModel.deleteMany).toHaveBeenCalledWith({ examId });
    expect(OfficialAnswerKeyModel.deleteMany).toHaveBeenCalledWith({ examId });
    expect(ExamFileModel.deleteMany).toHaveBeenCalledWith({ examId });
    expect(ExamModel.deleteOne).toHaveBeenCalledWith({ _id: examId });
  });
});
