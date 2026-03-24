import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { QuestionModel } from "../questions/question.model";
import { StudentModel } from "../students/student.model";
import { AnswerSheetModel } from "./answer-sheet.model";
import { ResultModel } from "./result.model";
import {
  diagnosisByClassroomSchema,
  registerAnswerSheetSchema,
  submitCorrectionSchema,
} from "./results.schemas";

export const resultsRouter = Router();

resultsRouter.post(
  "/answer-sheets",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const data = registerAnswerSheetSchema.parse(req.body);
      const answerSheet = await AnswerSheetModel.create({
        examId: new Types.ObjectId(data.examId),
        studentId: new Types.ObjectId(data.studentId),
        uploadUrl: data.uploadUrl,
      });
      res.status(201).json({ id: String(answerSheet._id) });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.post(
  "/corrections",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const data = submitCorrectionSchema.parse(req.body);
      const questionIds = data.answers.map((answer) => new Types.ObjectId(answer.questionId));
      const questions = await QuestionModel.find({ _id: { $in: questionIds } })
        .select("_id answer")
        .lean();
      const answerKey = new Map(questions.map((question) => [String(question._id), question.answer]));

      await ResultModel.deleteMany({ answerSheetId: data.answerSheetId });
      const docs = data.answers.map((answer) => {
        const correctAnswer = answerKey.get(answer.questionId);
        return {
          answerSheetId: new Types.ObjectId(data.answerSheetId),
          questionId: new Types.ObjectId(answer.questionId),
          markedAnswer: answer.markedAnswer,
          isCorrect: answer.markedAnswer === correctAnswer,
        };
      });

      await ResultModel.insertMany(docs);
      await AnswerSheetModel.updateOne(
        { _id: data.answerSheetId },
        { $set: { processingStatus: "DONE" } },
      );

      const hits = docs.filter((doc) => doc.isCorrect).length;
      res.json({ total: docs.length, correct: hits, percentage: docs.length ? (hits / docs.length) * 100 : 0 });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/diagnosis/classroom",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const filters = diagnosisByClassroomSchema.parse(req.query);
      const students = await StudentModel.find({ classroomId: filters.classroomId }).select("_id").lean();
      const studentIds = students.map((student) => student._id);

      const answerSheets = await AnswerSheetModel.find({
        studentId: { $in: studentIds },
        ...(filters.examId ? { examId: filters.examId } : {}),
      })
        .select("_id")
        .lean();

      const answerSheetIds = answerSheets.map((sheet) => sheet._id);

      const rows = await ResultModel.aggregate([
        { $match: { answerSheetId: { $in: answerSheetIds } } },
        {
          $lookup: {
            from: "questions",
            localField: "questionId",
            foreignField: "_id",
            as: "question",
          },
        },
        { $unwind: "$question" },
        {
          $group: {
            _id: "$question.descriptor",
            total: { $sum: 1 },
            correct: {
              $sum: { $cond: ["$isCorrect", 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            descriptor: "$_id",
            total: 1,
            correct: 1,
            accuracy: {
              $round: [{ $multiply: [{ $divide: ["$correct", "$total"] }, 100] }, 2],
            },
          },
        },
        { $sort: { descriptor: 1 } },
      ]);

      res.json(rows);
    } catch (error) {
      next(error);
    }
  },
);
