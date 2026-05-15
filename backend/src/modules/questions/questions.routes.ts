import { Router } from "express";
import { Types } from "mongoose";
import { canAccessClassroom } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { AnswerSheetModel } from "../results/answer-sheet.model";
import { ExamModel } from "../exams/exam.model";
import { StudentModel } from "../students/student.model";
import { aggregateDescriptorStats } from "../results/results.aggregate";
import {
  createQuestionSchema,
  listDescriptorsSchema,
  listQuestionsSchema,
  questionSuggestionsSchema,
  questionIdParamsSchema,
  updateQuestionSchema,
} from "./questions.schemas";
import { QuestionModel } from "./question.model";

export const questionsRouter = Router();

questionsRouter.get("/descriptors", requireAuth, async (req, res, next) => {
  try {
    const filters = listDescriptorsSchema.parse(req.query);
    const framework = filters.framework ?? "SAEB";
    const raw = await QuestionModel.distinct("descriptor", {
      discipline: filters.discipline,
      grade: filters.grade,
      framework,
    });
    const descriptors = raw
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      .map((d) => d.trim())
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    res.json({ descriptors });
  } catch (error) {
    next(error);
  }
});

questionsRouter.get("/suggestions", requireAuth, async (req, res, next) => {
  try {
    const filters = questionSuggestionsSchema.parse(req.query);
    const weakThreshold = filters.weakThreshold ?? 60;
    const limit = filters.limit ?? 15;

    const ok = await canAccessClassroom(req.user!, filters.classroomId);
    if (!ok) {
      res.status(403).json({ message: "Acesso negado a esta turma." });
      return;
    }

    const exams = await ExamModel.find({
      classroomId: new Types.ObjectId(filters.classroomId),
      discipline: filters.discipline,
      grade: filters.grade,
      framework: filters.framework,
    })
      .select("_id")
      .lean();

    if (!exams.length) {
      res.json({
        weakDescriptors: [],
        message: "Nenhuma prova encontrada para esta turma com os filtros informados.",
      });
      return;
    }

    const examIds = exams.map((e) => e._id);
    const students = await StudentModel.find({ classroomId: filters.classroomId }).select("_id").lean();
    const studentIds = students.map((s) => s._id);

    const sheets = await AnswerSheetModel.find({
      studentId: { $in: studentIds },
      examId: { $in: examIds },
    })
      .select("_id")
      .lean();

    const answerSheetIds = sheets.map((s) => s._id);
    const stats = await aggregateDescriptorStats(answerSheetIds);

    const weakDescriptors = stats
      .filter((row) => row.accuracy < weakThreshold)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, limit)
      .map((row) => ({
        descriptor: row.descriptor,
        axis: row.axis,
        accuracy: row.accuracy,
        total: row.total,
        correct: row.correct,
      }));

    res.json({ weakDescriptors, weakThreshold });
  } catch (error) {
    next(error);
  }
});

questionsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listQuestionsSchema.parse(req.query);
    const query = {
      ...(filters.discipline ? { discipline: filters.discipline } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
      ...(filters.framework ? { framework: filters.framework } : {}),
      ...(filters.descriptor ? { descriptor: filters.descriptor } : {}),
      ...(filters.axis ? { axis: filters.axis } : {}),
    };

    const questions = await QuestionModel.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("discipline grade framework descriptor axis prompt optionA optionB optionC optionD")
      .lean();

    res.json(questions);
  } catch (error) {
    next(error);
  }
});

questionsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const data = createQuestionSchema.parse(req.body);

    const question = await QuestionModel.create({
      discipline: data.discipline,
      grade: data.grade,
      framework: data.framework,
      descriptor: data.descriptor,
      ...(data.axis ? { axis: data.axis } : {}),
      prompt: data.prompt,
      optionA: data.optionA,
      optionB: data.optionB,
      optionC: data.optionC,
      optionD: data.optionD,
      answer: data.answer,
    });

    res.status(201).json({ id: String(question._id) });
  } catch (error) {
    next(error);
  }
});

questionsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = questionIdParamsSchema.parse(req.params);
    const question = await QuestionModel.findById(id).lean();
    if (!question) {
      res.status(404).json({ message: "Questao nao encontrada." });
      return;
    }
    res.json(question);
  } catch (error) {
    next(error);
  }
});

questionsRouter.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = questionIdParamsSchema.parse(req.params);
    const data = updateQuestionSchema.parse(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: "Nenhum campo para atualizar." });
      return;
    }
    const updated = await QuestionModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    if (!updated) {
      res.status(404).json({ message: "Questao nao encontrada." });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

questionsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = questionIdParamsSchema.parse(req.params);
    const qid = new Types.ObjectId(id);
    const existing = await QuestionModel.findById(qid).lean();
    if (!existing) {
      res.status(404).json({ message: "Questao nao encontrada." });
      return;
    }
    const inUse = await ExamModel.exists({ "questions.questionId": qid });
    if (inUse) {
      res.status(409).json({ message: "Questao vinculada a prova. Remova da prova antes de excluir." });
      return;
    }
    await QuestionModel.deleteOne({ _id: qid });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
