import path from "path";
import { Router } from "express";
import { Types } from "mongoose";
import { buildPublicFileUrl, getUploadRoot, saveBufferToStorage } from "../../lib/file-storage";
import { canAccessClassroom, canAccessSchool, canAccessStudent } from "../../lib/access";
import { suggestIntervention } from "../../lib/pedagogy";
import { upload } from "../../lib/upload";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { ExamModel } from "../exams/exam.model";
import { OfficialAnswerKeyModel } from "../exams/official-answer-key.model";
import { QuestionModel } from "../questions/question.model";
import { SchoolModel } from "../schools/school.model";
import { StudentModel } from "../students/student.model";
import { generateUniqueSheetCode } from "./answer-sheet-code";
import { AnswerSheetModel } from "./answer-sheet.model";
import { AnswerSheetScanModel } from "./answer-sheet-scan.model";
import { runOmrOnImage } from "./omr.service";
import { aggregateAxisStats, aggregateDescriptorStats } from "./results.aggregate";
import { ResultModel } from "./result.model";
import {
  answerSheetIdParamSchema,
  answerSheetScanParamsSchema,
  classroomHeatmapSchema,
  classroomRankingSchema,
  classroomReportSchema,
  createAnswerSheetScanSchema,
  diagnosisByClassroomSchema,
  municipalitySummarySchema,
  patchAnswerSheetSchema,
  processAnswerSheetScanSchema,
  registerAnswerSheetSchema,
  schoolSummarySchema,
  studentSummarySchema,
  submitCorrectionSchema,
  submitMarksByOrderSchema,
} from "./results.schemas";

export const resultsRouter = Router();

function getBaseUrl(req: any): string {
  return `${req.protocol}://${req.get("host")}`;
}

async function getActiveAnswerKeyOrThrow(examId: Types.ObjectId) {
  const key = await OfficialAnswerKeyModel.findOne({ examId, isActive: true }).lean();
  if (!key) {
    throw Object.assign(new Error("Gabarito oficial nao publicado para esta prova."), { statusCode: 400 });
  }
  return key;
}

async function buildAnswerSheetPayload(examId: string, studentId: string) {
  const [exam, student] = await Promise.all([
    ExamModel.findById(examId).lean(),
    StudentModel.findById(studentId).lean(),
  ]);

  if (!exam) {
    throw Object.assign(new Error("Prova nao encontrada."), { statusCode: 404 });
  }
  if (!student) {
    throw Object.assign(new Error("Aluno nao encontrado."), { statusCode: 404 });
  }
  if (String(student.classroomId) !== String(exam.classroomId)) {
    throw Object.assign(new Error("O aluno nao pertence a turma vinculada a esta prova."), { statusCode: 400 });
  }

  const [school, classroom] = await Promise.all([
    SchoolModel.findById(exam.schoolId).lean(),
    ClassroomModel.findById(exam.classroomId).lean(),
  ]);

  if (!school || !classroom) {
    throw Object.assign(new Error("Escola ou turma vinculada nao encontrada."), { statusCode: 404 });
  }

  const sheetCode = await generateUniqueSheetCode();
  const qrPayload = JSON.stringify({
    sheetCode,
    examId: String(exam._id),
    studentId: String(student._id),
    examCode: exam.examCode,
    omrTemplateVersion: exam.omrTemplateVersion,
  });

  return {
    examId: exam._id,
    studentId: student._id,
    sheetCode,
    qrPayload,
    studentSnapshot: {
      fullName: student.fullName,
      registrationCode: student.registrationCode,
    },
    classroomSnapshot: {
      name: classroom.name,
      grade: classroom.grade,
    },
    schoolSnapshot: {
      name: school.name,
      city: school.city,
    },
    layout: {
      questionsPerPage: exam.questionCount,
      totalQuestions: exam.questionCount,
      optionsPerQuestion: 4 as const,
      anchorSetVersion: exam.omrTemplateVersion,
    },
    generatedAt: new Date(),
    status: "GENERATED" as const,
    processingStatus: "PENDING" as const,
  };
}

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
  answers: { order?: number; questionId?: string | null; markedAnswer: string; confidence?: number | null }[],
  correctionSource: "MANUAL" | "OMR" = "MANUAL",
  answerSheetScanId?: string,
): Promise<{ totalEffective: number; correct: number; percentage: number }> {
  const sheet = await AnswerSheetModel.findById(answerSheetId).lean();
  if (!sheet) {
    throw Object.assign(new Error("Cartao nao encontrado."), { statusCode: 404 });
  }

  const exam = await ExamModel.findById(sheet.examId).lean();
  if (!exam) {
    throw Object.assign(new Error("Prova nao encontrada."), { statusCode: 404 });
  }

  const answerKey = await getActiveAnswerKeyOrThrow(exam._id);
  const officialByOrder = new Map(answerKey.items.map((item) => [item.order, item]));
  const questionIdByOrder = new Map(
    exam.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => [item.order, String(item.questionId)]),
  );
  const orderByQuestionId = new Map(
    exam.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => [String(item.questionId), item.order]),
  );

  if (answers.length !== exam.questionCount) {
    throw Object.assign(
      new Error(`Envie exatamente ${exam.questionCount} resposta(s), uma por questao da prova.`),
      { statusCode: 400 },
    );
  }

  const resolvedAnswers = answers.map((answer) => ({
    ...answer,
    order: answer.order ?? (answer.questionId ? orderByQuestionId.get(answer.questionId) : undefined),
  }));

  const submittedOrders = resolvedAnswers.map((a) => a.order);
  if (submittedOrders.some((order) => order === undefined)) {
    throw Object.assign(new Error("Nao foi possivel identificar a ordem de todas as questoes."), {
      statusCode: 400,
    });
  }
  if (new Set(submittedOrders).size !== submittedOrders.length) {
    throw Object.assign(new Error("Ordem duplicada na correcao."), { statusCode: 400 });
  }

  for (const answer of resolvedAnswers) {
    if (!answer.order || !officialByOrder.has(answer.order)) {
      throw Object.assign(new Error("Questao fora da ordem esperada para esta prova."), { statusCode: 400 });
    }
  }

  const docs = resolvedAnswers.map((answer) => {
    const official = officialByOrder.get(answer.order!);
    if (!official) {
      throw Object.assign(new Error("Item do gabarito nao encontrado."), { statusCode: 400 });
    }
    const resolvedQuestionId = answer.questionId ?? questionIdByOrder.get(answer.order!) ?? null;
    const isVoided = official.isVoided || official.correctAnswer === "N/A";
    const marked = isVoided ? "N/A" : answer.markedAnswer;
    const isCorrect =
      !isVoided &&
      marked !== "X" &&
      marked !== "N/A" &&
      marked === official.correctAnswer;

    return {
      answerSheetId: new Types.ObjectId(answerSheetId),
      examId: exam._id,
      studentId: sheet.studentId,
      questionId: resolvedQuestionId ? new Types.ObjectId(resolvedQuestionId) : null,
      order: answer.order!,
      officialAnswer: official.correctAnswer,
      markedAnswer: marked as "A" | "B" | "C" | "D" | "X" | "N/A",
      isCorrect,
      score: isCorrect ? 1 : 0,
      correctionSource,
      answerSheetScanId: answerSheetScanId ? new Types.ObjectId(answerSheetScanId) : null,
      confidence: answer.confidence ?? null,
    };
  });

  await ResultModel.deleteMany({ answerSheetId: new Types.ObjectId(answerSheetId) });
  await ResultModel.insertMany(docs);
  await AnswerSheetModel.updateOne(
    { _id: answerSheetId },
    { $set: { processingStatus: "DONE", status: "PROCESSED", processedAt: new Date() } },
  );

  const effective = docs.filter((d) => d.officialAnswer !== "N/A");
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

      const exam = await ExamModel.findById(data.examId).select("schoolId classroomId").lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }
      const okExam = await canAccessSchool(req.user!, String(exam.schoolId));
      if (!okExam) {
        res.status(403).json({ message: "Acesso negado a esta prova." });
        return;
      }

      const existing = await AnswerSheetModel.findOne({
        examId: new Types.ObjectId(data.examId),
        studentId: new Types.ObjectId(data.studentId),
      });

      if (existing) {
        res.json({ id: String(existing._id), alreadyExists: true });
        return;
      }

      try {
        const payload = await buildAnswerSheetPayload(data.examId, data.studentId);
        const answerSheet = await AnswerSheetModel.create({
          ...payload,
          uploadUrl: data.uploadUrl,
        });
        res.status(201).json({ id: String(answerSheet._id), sheetCode: answerSheet.sheetCode });
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
        const normalizedAnswers = data.answers.map((answer) => ({
          questionId: answer.questionId,
          markedAnswer: answer.markedAnswer,
        }));
        const stats = await persistExamCorrection(data.answerSheetId, normalizedAnswers, "MANUAL");
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
        const normalizedAnswers = data.marks.map((mark, index) => ({
          order: mark.order,
          questionId: answers[index]?.questionId,
          markedAnswer: mark.markedAnswer,
        }));
        const stats = await persistExamCorrection(data.answerSheetId, normalizedAnswers, "MANUAL");
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
  "/answer-sheets/:id/scans",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { id } = answerSheetIdParamSchema.parse(req.params);
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

      const scans = await AnswerSheetScanModel.find({ answerSheetId: sheet._id }).sort({ createdAt: -1 }).lean();
      res.json(
        scans.map((scan) => ({
          id: String(scan._id),
          processingStatus: scan.processingStatus,
          scanType: scan.scanType,
          createdAt: scan.createdAt,
          selectedForResult: scan.selectedForResult,
          url: buildPublicFileUrl(getBaseUrl(req), scan.storageKey),
          parsedMarks: scan.parsedMarks,
          omrMetrics: scan.omrMetrics,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.post(
  "/answer-sheets/:id/scans",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const { id } = answerSheetIdParamSchema.parse(req.params);
      const body = createAnswerSheetScanSchema.parse(req.body ?? {});
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

      if (!req.file) {
        res.status(400).json({ message: "Envie a imagem do cartao-resposta." });
        return;
      }

      if (!req.file.mimetype.startsWith("image/")) {
        res.status(400).json({ message: "O MVP atual aceita apenas imagens (foto ou scan) para OMR." });
        return;
      }

      const saved = await saveBufferToStorage({
        buffer: req.file.buffer,
        relativeDir: `answer-sheets/${id}/scans`,
        filename: req.file.originalname || "cartao-scan.png",
      });

      const scan = await AnswerSheetScanModel.create({
        answerSheetId: sheet._id,
        examId: sheet.examId,
        studentId: sheet.studentId,
        storageProvider: "LOCAL",
        storageKey: saved.storageKey,
        filename: req.file.originalname || "cartao-scan.png",
        mimeType: req.file.mimetype,
        sizeBytes: saved.sizeBytes,
        uploadedBy: new Types.ObjectId(req.user!.id),
        scanType: body.scanType ?? "PHOTO",
        processingStatus: "PENDING",
      });

      const publicUrl = buildPublicFileUrl(getBaseUrl(req), scan.storageKey);
      await AnswerSheetModel.updateOne(
        { _id: sheet._id },
        { $set: { uploadUrl: publicUrl, status: "SUBMITTED", processingStatus: "PENDING" } },
      );

      res.status(201).json({
        id: String(scan._id),
        url: publicUrl,
        processingStatus: scan.processingStatus,
      });
    } catch (error) {
      next(error);
    }
  },
);

resultsRouter.post(
  "/answer-sheets/:id/scans/process",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { id } = answerSheetIdParamSchema.parse(req.params);
      const data = processAnswerSheetScanSchema.parse(req.body);
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

      const scan = await AnswerSheetScanModel.findOne({
        _id: new Types.ObjectId(data.scanId),
        answerSheetId: sheet._id,
      }).lean();
      if (!scan) {
        res.status(404).json({ message: "Scan nao encontrado para este cartao." });
        return;
      }

      const exam = await ExamModel.findById(sheet.examId).select("questionCount omrTemplateVersion").lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }

      await AnswerSheetScanModel.updateOne({ _id: scan._id }, { $set: { processingStatus: "PROCESSING" } });
      await AnswerSheetModel.updateOne({ _id: sheet._id }, { $set: { processingStatus: "PROCESSING" } });

      try {
        const absolutePath = path.join(getUploadRoot(), scan.storageKey);
        const omr = await runOmrOnImage({
          absolutePath,
          totalQuestions: exam.questionCount,
          anchorSetVersion: exam.omrTemplateVersion,
        });

        await AnswerSheetScanModel.updateOne(
          { _id: scan._id },
          {
            $set: {
              processingStatus: omr.omrMetrics.confidence < 0.08 ? "NEEDS_REVIEW" : "DONE",
              parsedMarks: omr.parsedMarks,
              omrMetrics: omr.omrMetrics,
              errorMessage: null,
              selectedForResult: data.selectForResult ?? true,
            },
          },
        );

        if (data.selectForResult ?? true) {
          await AnswerSheetScanModel.updateMany(
            { answerSheetId: sheet._id, _id: { $ne: scan._id } },
            { $set: { selectedForResult: false } },
          );
        }

        const stats = await persistExamCorrection(
          String(sheet._id),
          omr.parsedMarks.map((mark) => ({
            order: mark.order,
            markedAnswer: mark.detectedAnswer,
            confidence: mark.confidence,
          })),
          "OMR",
          String(scan._id),
        );

        res.json({
          scanId: String(scan._id),
          totalEffective: stats.totalEffective,
          correct: stats.correct,
          percentage: stats.percentage,
          omrMetrics: omr.omrMetrics,
          parsedMarks: omr.parsedMarks,
        });
      } catch (e) {
        const err = e as { message?: string; statusCode?: number };
        await AnswerSheetScanModel.updateOne(
          { _id: scan._id },
          {
            $set: {
              processingStatus: "ERROR",
              errorMessage: err.message ?? "Falha no processamento OMR.",
            },
          },
        );
        await AnswerSheetModel.updateOne({ _id: sheet._id }, { $set: { processingStatus: "ERROR", status: "ERROR" } });

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

      const sheets = await AnswerSheetModel.find(filter).select("_id studentId examId").lean();
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
