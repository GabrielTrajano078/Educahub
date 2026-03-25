import { Router } from "express";
import { Types } from "mongoose";
import { canAccessClassroom, canAccessSchool, canAccessStudent } from "../../lib/access";
import { suggestIntervention } from "../../lib/pedagogy";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { ExamModel } from "../exams/exam.model";
import { QuestionModel } from "../questions/question.model";
import { SchoolModel } from "../schools/school.model";
import { StudentModel } from "../students/student.model";
import { AnswerSheetModel } from "./answer-sheet.model";
import { aggregateAxisStats, aggregateDescriptorStats } from "./results.aggregate";
import { ResultModel } from "./result.model";
import {
  answerSheetIdParamSchema,
  classroomHeatmapSchema,
  classroomRankingSchema,
  classroomReportSchema,
  diagnosisByClassroomSchema,
  municipalitySummarySchema,
  patchAnswerSheetSchema,
  registerAnswerSheetSchema,
  schoolSummarySchema,
  studentSummarySchema,
  submitCorrectionSchema,
  submitMarksByOrderSchema,
} from "./results.schemas";

export const resultsRouter = Router();

async function answerSheetIdsForClassroom(
  classroomId: string,
  examId?: string,
): Promise<Types.ObjectId[]> {
  const students = await StudentModel.find({ classroomId }).select("_id").lean();
  const studentIds = students.map((s) => s._id);
  if (!studentIds.length) return [];

  const filter: Record<string, unknown> = { studentId: { $in: studentIds } };
  if (examId) filter.examId = new Types.ObjectId(examId);

  const sheets = await AnswerSheetModel.find(filter).select("_id").lean();
  return sheets.map((s) => s._id);
}

async function persistExamCorrection(
  answerSheetId: string,
  answers: { questionId: string; markedAnswer: string }[],
): Promise<{ totalEffective: number; correct: number; percentage: number }> {
  const sheet = await AnswerSheetModel.findById(answerSheetId).lean();
  if (!sheet) {
    throw Object.assign(new Error("Cartao nao encontrado."), { statusCode: 404 });
  }

  const exam = await ExamModel.findById(sheet.examId).lean();
  if (!exam) {
    throw Object.assign(new Error("Prova nao encontrada."), { statusCode: 404 });
  }

  const examQuestionIds = new Set(exam.questions.map((q) => String(q.questionId)));
  const voided = new Set((exam.voidedQuestionIds ?? []).map((id) => String(id)));

  if (answers.length !== exam.questions.length) {
    throw Object.assign(
      new Error(`Envie exatamente ${exam.questions.length} resposta(s), uma por questao da prova.`),
      { statusCode: 400 },
    );
  }

  const submittedIds = answers.map((a) => a.questionId);
  if (new Set(submittedIds).size !== submittedIds.length) {
    throw Object.assign(new Error("questionId duplicado na correcao."), { statusCode: 400 });
  }

  for (const answer of answers) {
    if (!examQuestionIds.has(answer.questionId)) {
      throw Object.assign(new Error("Questao nao pertence a esta prova."), { statusCode: 400 });
    }
  }

  const questionIds = answers.map((a) => new Types.ObjectId(a.questionId));
  const questions = await QuestionModel.find({ _id: { $in: questionIds } })
    .select("_id answer")
    .lean();
  const answerKey = new Map(questions.map((q) => [String(q._id), q.answer]));

  const docs = answers.map((answer) => {
    const correctAnswer = answerKey.get(answer.questionId);
    if (correctAnswer === undefined) {
      throw Object.assign(new Error("Questao referenciada nao existe mais no banco."), { statusCode: 400 });
    }
    const isVoided = voided.has(answer.questionId);
    const marked = isVoided ? "N/A" : answer.markedAnswer;
    const isCorrect =
      !isVoided &&
      marked !== "X" &&
      marked !== "N/A" &&
      marked === correctAnswer;

    return {
      answerSheetId: new Types.ObjectId(answerSheetId),
      questionId: new Types.ObjectId(answer.questionId),
      markedAnswer: marked as "A" | "B" | "C" | "D" | "X" | "N/A",
      isCorrect,
    };
  });

  await ResultModel.deleteMany({ answerSheetId: new Types.ObjectId(answerSheetId) });
  await ResultModel.insertMany(docs);
  await AnswerSheetModel.updateOne({ _id: answerSheetId }, { $set: { processingStatus: "DONE" } });

  const effective = docs.filter((d) => !voided.has(String(d.questionId)));
  const correct = effective.filter((d) => d.isCorrect).length;
  const totalEffective = effective.length;
  const percentage = totalEffective ? (correct / totalEffective) * 100 : 0;

  return {
    totalEffective,
    correct,
    percentage: Math.round(percentage * 100) / 100,
  };
}

resultsRouter.post(
  "/answer-sheets",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const data = registerAnswerSheetSchema.parse(req.body);

      const okStudent = await canAccessStudent(req.user!, data.studentId);
      if (!okStudent) {
        res.status(403).json({ message: "Acesso negado a este aluno." });
        return;
      }

      const exam = await ExamModel.findById(data.examId).select("schoolId").lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }
      const okExam = await canAccessSchool(req.user!, String(exam.schoolId));
      if (!okExam) {
        res.status(403).json({ message: "Acesso negado a esta prova." });
        return;
      }

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

resultsRouter.patch(
  "/answer-sheets/:id",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { id } = answerSheetIdParamSchema.parse(req.params);
      const body = patchAnswerSheetSchema.parse(req.body);

      const sheet = await AnswerSheetModel.findById(id).lean();
      if (!sheet) {
        res.status(404).json({ message: "Cartao nao encontrado." });
        return;
      }

      const ok = await canAccessStudent(req.user!, String(sheet.studentId));
      if (!ok) {
        res.status(403).json({ message: "Acesso negado." });
        return;
      }

      await AnswerSheetModel.updateOne({ _id: id }, { $set: body });
      res.json({ ok: true });
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

      const sheet = await AnswerSheetModel.findById(data.answerSheetId).lean();
      if (!sheet) {
        res.status(404).json({ message: "Cartao nao encontrado." });
        return;
      }
      const ok = await canAccessStudent(req.user!, String(sheet.studentId));
      if (!ok) {
        res.status(403).json({ message: "Acesso negado." });
        return;
      }

      try {
        const stats = await persistExamCorrection(data.answerSheetId, data.answers);
        res.json({
          total: data.answers.length,
          totalEffective: stats.totalEffective,
          correct: stats.correct,
          percentage: stats.percentage,
        });
      } catch (e) {
        const err = e as { statusCode?: number; message?: string };
        if (err.statusCode === 404) {
          res.status(404).json({ message: err.message });
          return;
        }
        if (err.statusCode === 400) {
          res.status(400).json({ message: err.message });
          return;
        }
        throw e;
      }
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.post(
  "/corrections/by-order",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const data = submitMarksByOrderSchema.parse(req.body);

      const sheet = await AnswerSheetModel.findById(data.answerSheetId).lean();
      if (!sheet) {
        res.status(404).json({ message: "Cartao nao encontrado." });
        return;
      }
      const ok = await canAccessStudent(req.user!, String(sheet.studentId));
      if (!ok) {
        res.status(403).json({ message: "Acesso negado." });
        return;
      }

      const exam = await ExamModel.findById(sheet.examId).lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }

      const byOrder = new Map(exam.questions.map((q) => [q.order, String(q.questionId)]));
      const seen = new Set<number>();
      const answers: { questionId: string; markedAnswer: string }[] = [];

      for (const m of data.marks) {
        if (seen.has(m.order)) {
          res.status(400).json({ message: `Ordem duplicada: ${m.order}.` });
          return;
        }
        seen.add(m.order);
        const qid = byOrder.get(m.order);
        if (!qid) {
          res.status(400).json({ message: `Ordem invalida: ${m.order}.` });
          return;
        }
        answers.push({ questionId: qid, markedAnswer: m.markedAnswer });
      }

      if (answers.length !== exam.questions.length) {
        res.status(400).json({
          message: `Informe exatamente ${exam.questions.length} marcacao(oes) (uma por questao).`,
        });
        return;
      }

      try {
        const stats = await persistExamCorrection(data.answerSheetId, answers);
        res.json({
          total: answers.length,
          totalEffective: stats.totalEffective,
          correct: stats.correct,
          percentage: stats.percentage,
        });
      } catch (e) {
        const err = e as { statusCode?: number; message?: string };
        if (err.statusCode === 400) {
          res.status(400).json({ message: err.message });
          return;
        }
        throw e;
      }
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

      const ok = await canAccessClassroom(req.user!, filters.classroomId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta turma." });
        return;
      }

      const answerSheetIds = await answerSheetIdsForClassroom(filters.classroomId, filters.examId);
      const rows = await aggregateDescriptorStats(answerSheetIds);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/diagnosis/classroom/by-axis",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const filters = diagnosisByClassroomSchema.parse(req.query);

      const ok = await canAccessClassroom(req.user!, filters.classroomId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta turma." });
        return;
      }

      const answerSheetIds = await answerSheetIdsForClassroom(filters.classroomId, filters.examId);
      const rows = await aggregateAxisStats(answerSheetIds);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/student/:studentId/summary",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const parsed = studentSummarySchema.safeParse({
        studentId: req.params.studentId,
        examId: req.query.examId,
      });
      if (!parsed.success) {
        res.status(400).json({ message: "Parametros invalidos.", issues: parsed.error.issues });
        return;
      }
      const { studentId, examId: examIdFilter } = parsed.data;

      const ok = await canAccessStudent(req.user!, studentId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a este aluno." });
        return;
      }

      const filter: Record<string, unknown> = { studentId: new Types.ObjectId(studentId) };
      if (examIdFilter) {
        filter.examId = new Types.ObjectId(examIdFilter);
      }

      const sheets = await AnswerSheetModel.find(filter).select("_id examId").lean();
      const answerSheetIds = sheets.map((s) => s._id);

      const byDescriptor = await aggregateDescriptorStats(answerSheetIds);
      const byAxis = await aggregateAxisStats(answerSheetIds);

      res.json({
        studentId,
        answerSheets: sheets.map((s) => ({ id: String(s._id), examId: String(s.examId) })),
        byDescriptor,
        byAxis,
      });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/classroom/:classroomId/ranking",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { classroomId, examId } = classroomRankingSchema.parse({
        classroomId: req.params.classroomId,
        examId: req.query.examId,
      });

      const ok = await canAccessClassroom(req.user!, classroomId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta turma." });
        return;
      }

      const students = await StudentModel.find({ classroomId }).select("_id fullName").lean();
      const filter: Record<string, unknown> = {
        studentId: { $in: students.map((s) => s._id) },
      };
      if (examId) filter.examId = new Types.ObjectId(examId);

      const sheets = await AnswerSheetModel.find(filter).select("_id studentId").lean();
      const byStudent = new Map(students.map((s) => [String(s._id), s.fullName]));

      const rows: {
        studentId: string;
        studentName: string;
        answerSheetId: string;
        totalEffective: number;
        correct: number;
        percentage: number;
      }[] = [];

      for (const sh of sheets) {
        const exam = await ExamModel.findById(sh.examId).select("voidedQuestionIds").lean();
        const voided = new Set((exam?.voidedQuestionIds ?? []).map((id) => String(id)));

        const results = await ResultModel.find({ answerSheetId: sh._id }).select("questionId isCorrect").lean();
        let totalEffective = 0;
        let correct = 0;
        for (const r of results) {
          if (voided.has(String(r.questionId))) continue;
          totalEffective += 1;
          if (r.isCorrect) correct += 1;
        }

        rows.push({
          studentId: String(sh.studentId),
          studentName: byStudent.get(String(sh.studentId)) ?? "",
          answerSheetId: String(sh._id),
          totalEffective,
          correct,
          percentage: totalEffective ? Math.round((correct / totalEffective) * 10000) / 100 : 0,
        });
      }

      rows.sort((a, b) => b.percentage - a.percentage);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/classroom/:classroomId/heatmap",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { classroomId, examId, masteryThreshold, weakThreshold } = classroomHeatmapSchema.parse({
        classroomId: req.params.classroomId,
        examId: req.query.examId,
        masteryThreshold: req.query.masteryThreshold,
        weakThreshold: req.query.weakThreshold,
      });

      const mastery = masteryThreshold ?? 70;
      const weak = weakThreshold ?? 50;

      const ok = await canAccessClassroom(req.user!, classroomId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta turma." });
        return;
      }

      const answerSheetIds = await answerSheetIdsForClassroom(classroomId, examId);
      const descriptors = await aggregateDescriptorStats(answerSheetIds);

      const dominated = descriptors.filter((d) => d.accuracy >= mastery).map((d) => d.descriptor);
      const notDominated = descriptors.filter((d) => d.accuracy < weak).map((d) => d.descriptor);
      const intermediate = descriptors
        .filter((d) => d.accuracy >= weak && d.accuracy < mastery)
        .map((d) => d.descriptor);

      res.json({
        masteryThreshold: mastery,
        weakThreshold: weak,
        dominated,
        notDominated,
        intermediate,
        byDescriptor: descriptors,
      });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/school/:schoolId/summary",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { schoolId, examId } = schoolSummarySchema.parse({
        schoolId: req.params.schoolId,
        examId: req.query.examId,
      });

      const ok = await canAccessSchool(req.user!, schoolId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta escola." });
        return;
      }

      const classrooms = await ClassroomModel.find({ schoolId }).select("_id name grade").lean();
      const out = [];

      for (const c of classrooms) {
        const answerSheetIds = await answerSheetIdsForClassroom(String(c._id), examId);
        const byDescriptor = await aggregateDescriptorStats(answerSheetIds);
        const avg =
          byDescriptor.length === 0
            ? 0
            : Math.round(
                (byDescriptor.reduce((acc, d) => acc + d.accuracy, 0) / byDescriptor.length) * 100,
              ) / 100;

        out.push({
          classroomId: String(c._id),
          name: c.name,
          grade: c.grade,
          descriptorCount: byDescriptor.length,
          meanAccuracyAcrossDescriptors: avg,
          byDescriptor,
        });
      }

      res.json({ schoolId, classrooms: out });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/municipality/summary",
  requireAuth,
  requireRole("admin", "gestor"),
  async (req, res, next) => {
    try {
      const { municipalityCode, examId } = municipalitySummarySchema.parse({
        municipalityCode: req.query.municipalityCode,
        examId: req.query.examId,
      });

      if (req.user!.role === "gestor" && req.user!.municipalityCode !== municipalityCode) {
        res.status(403).json({ message: "Municipio nao autorizado." });
        return;
      }

      const schools = await SchoolModel.find({ municipalityCode }).select("_id name").lean();
      const out = [];

      for (const s of schools) {
        const classrooms = await ClassroomModel.find({ schoolId: s._id }).select("_id").lean();
        const allSheetIds: Types.ObjectId[] = [];
        for (const c of classrooms) {
          const ids = await answerSheetIdsForClassroom(String(c._id), examId);
          allSheetIds.push(...ids);
        }
        const byDescriptor = await aggregateDescriptorStats(allSheetIds);
        const critical = byDescriptor
          .filter((d) => d.accuracy < 50)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 10);

        out.push({
          schoolId: String(s._id),
          name: s.name,
          byDescriptor,
          criticalDescriptors: critical,
        });
      }

      res.json({ municipalityCode, schools: out });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.get(
  "/reports/classroom/:classroomId",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { classroomId, examId } = classroomReportSchema.parse({
        classroomId: req.params.classroomId,
        examId: req.query.examId,
      });

      const ok = await canAccessClassroom(req.user!, classroomId);
      if (!ok) {
        res.status(403).json({ message: "Acesso negado a esta turma." });
        return;
      }

      const answerSheetIds = await answerSheetIdsForClassroom(classroomId, examId);
      const byDescriptor = await aggregateDescriptorStats(answerSheetIds);
      const byAxis = await aggregateAxisStats(answerSheetIds);

      const mastered = byDescriptor.filter((d) => d.accuracy >= 70).map((d) => d.descriptor);
      const notMastered = byDescriptor.filter((d) => d.accuracy < 50).map((d) => d.descriptor);

      const interventions = notMastered.map((descriptor) => {
        const row = byDescriptor.find((r) => r.descriptor === descriptor);
        return {
          descriptor,
          axis: row?.axis ?? null,
          suggestion: suggestIntervention(descriptor, row?.axis ?? null),
        };
      });

      const classroom = await ClassroomModel.findById(classroomId).select("name grade schoolId").lean();

      res.json({
        classroom: classroom
          ? {
              id: String(classroom._id),
              name: classroom.name,
              grade: classroom.grade,
              schoolId: String(classroom.schoolId),
            }
          : null,
        byDescriptor,
        byAxis,
        masteredDescriptors: mastered,
        notMasteredDescriptors: notMastered,
        interventions,
      });
    } catch (error) {
      next(error);
    }
  },
);
