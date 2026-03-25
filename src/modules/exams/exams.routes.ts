import { Router } from "express";
import { Types } from "mongoose";
import { canAccessClassroom, canAccessSchool } from "../../lib/access";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { QuestionModel } from "../questions/question.model";
import { SchoolModel } from "../schools/school.model";
import { generateUniqueExamCode } from "./exam-code";
import { ExamModel } from "./exam.model";
import {
  createExamSchema,
  examIdParamSchema,
  listExamsSchema,
  simulatedBlueprintQuerySchema,
} from "./exams.schemas";
import { getSimulatedBlueprint } from "./simulated-blueprint";

export const examsRouter = Router();

examsRouter.get("/blueprint/simulado", requireAuth, async (req, res, next) => {
  try {
    const q = simulatedBlueprintQuerySchema.parse(req.query);
    const blueprintByAxis = getSimulatedBlueprint(q.framework, q.discipline, q.grade);
    res.json({
      framework: q.framework,
      discipline: q.discipline,
      grade: q.grade,
      blueprintByAxis,
      totalQuestions: blueprintByAxis.reduce((acc, b) => acc + b.count, 0),
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listExamsSchema.parse(req.query);
    const query: Record<string, unknown> = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
      ...(filters.discipline ? { discipline: filters.discipline } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
    };

    if (req.user!.role === "professor" || req.user!.role === "coordenador") {
      if (!req.user!.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = req.user!.schoolId;
    }

    if (req.user!.role === "gestor") {
      if (!req.user!.municipalityCode) {
        res.status(403).json({ message: "Gestor sem municipio vinculado." });
        return;
      }
      const schools = await SchoolModel.find({ municipalityCode: req.user!.municipalityCode })
        .select("_id")
        .lean();
      const ids = schools.map((s) => s._id);
      query.schoolId = { $in: ids };
    }

    const exams = await ExamModel.find(query).sort({ createdAt: -1 }).lean();
    res.json(exams);
  } catch (error) {
    next(error);
  }
});

examsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await ExamModel.findById(id).lean();
    if (!exam) {
      res.status(404).json({ message: "Prova nao encontrada." });
      return;
    }

    const allowed = await canAccessSchool(req.user!, String(exam.schoolId));
    if (!allowed) {
      res.status(403).json({ message: "Acesso negado a esta prova." });
      return;
    }

    const questionIds = exam.questions.map((q) => q.questionId);
    const questions = await QuestionModel.find({ _id: { $in: questionIds } }).lean();
    const byId = new Map(questions.map((q) => [String(q._id), q]));

    const includeAnswers = req.user!.role === "admin";

    const items = exam.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((eq) => {
        const doc = byId.get(String(eq.questionId));
        if (!doc) return { order: eq.order, questionId: String(eq.questionId), missing: true };
        const base = {
          order: eq.order,
          questionId: String(eq.questionId),
          discipline: doc.discipline,
          grade: doc.grade,
          framework: doc.framework,
          descriptor: doc.descriptor,
          axis: doc.axis,
          difficulty: doc.difficulty,
          prompt: doc.prompt,
          optionA: doc.optionA,
          optionB: doc.optionB,
          optionC: doc.optionC,
          optionD: doc.optionD,
        };
        if (includeAnswers) {
          return { ...base, answer: doc.answer };
        }
        return base;
      });

    res.json({
      ...exam,
      _id: String(exam._id),
      schoolId: String(exam.schoolId),
      classroomId: String(exam.classroomId),
      createdBy: String(exam.createdBy),
      examType: exam.examType ?? "PERSONALIZADA",
      examCode: exam.examCode ?? null,
      voidedQuestionIds: (exam.voidedQuestionIds ?? []).map(String),
      questions: items,
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.post(
  "/",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const data = createExamSchema.parse(req.body);

      const schoolOk = await canAccessSchool(req.user!, data.schoolId);
      if (!schoolOk) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }

      const classOk = await canAccessClassroom(req.user!, data.classroomId);
      if (!classOk) {
        res.status(403).json({ message: "Acesso negado a esta turma." });
        return;
      }

      let questionIds: string[] = data.questionIds ? [...data.questionIds] : [];
      const selected: string[] = [];

      if (data.blueprint?.length) {
        for (const block of data.blueprint) {
          const docs = await QuestionModel.find({
            discipline: data.discipline,
            grade: data.grade,
            framework: data.framework,
            descriptor: block.descriptor,
            _id: { $nin: selected.map((id) => new Types.ObjectId(id)) },
          })
            .limit(block.count)
            .select("_id")
            .lean();

          if (docs.length < block.count) {
            res.status(400).json({
              message: `Banco insuficiente para o descritor ${block.descriptor}.`,
            });
            return;
          }

          selected.push(...docs.map((doc) => String(doc._id)));
        }
        questionIds = selected;
      }

      if (data.blueprintByAxis?.length) {
        for (const block of data.blueprintByAxis) {
          const docs = await QuestionModel.find({
            discipline: data.discipline,
            grade: data.grade,
            framework: data.framework,
            axis: block.axis,
            _id: { $nin: selected.map((id) => new Types.ObjectId(id)) },
          })
            .limit(block.count)
            .select("_id")
            .lean();

          if (docs.length < block.count) {
            res.status(400).json({
              message: `Banco insuficiente para o eixo ${block.axis}. Cadastre questoes com esse eixo ou ajuste o simulado.`,
            });
            return;
          }

          selected.push(...docs.map((doc) => String(doc._id)));
        }
        questionIds = selected;
      }

      const questions = questionIds.map((questionId, index) => ({
        questionId: new Types.ObjectId(questionId),
        order: index + 1,
      }));

      const examCode = await generateUniqueExamCode();
      const voided = (data.voidedQuestionIds ?? []).map((id) => new Types.ObjectId(id));

      const exam = await ExamModel.create({
        schoolId: new Types.ObjectId(data.schoolId),
        classroomId: new Types.ObjectId(data.classroomId),
        title: data.title,
        discipline: data.discipline,
        grade: data.grade,
        framework: data.framework,
        examType: data.examType ?? "PERSONALIZADA",
        examCode,
        voidedQuestionIds: voided,
        createdBy: new Types.ObjectId(req.user!.id),
        questions,
      });

      res.status(201).json({
        id: String(exam._id),
        examCode: exam.examCode,
        totalQuestions: exam.questions.length,
      });
    } catch (error) {
      next(error);
    }
  },
);
