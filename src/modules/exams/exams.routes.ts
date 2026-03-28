import { Router } from "express";
import { Types } from "mongoose";
import { buildPublicFileUrl, saveBufferToStorage } from "../../lib/file-storage";
import { canAccessClassroom, canAccessSchool, canAccessStudent } from "../../lib/access";
import { upload } from "../../lib/upload";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { AuthUser } from "../../types/auth";
import { ClassroomModel } from "../classes/classroom.model";
import { buildAnswerSheetsPdf } from "../results/answer-sheet-pdf";
import { generateUniqueSheetCode } from "../results/answer-sheet-code";
import { AnswerSheetModel } from "../results/answer-sheet.model";
import { QuestionModel } from "../questions/question.model";
import { SchoolModel } from "../schools/school.model";
import { StudentModel } from "../students/student.model";
import { generateUniqueExamCode } from "./exam-code";
import { ExamFileModel } from "./exam-file.model";
import { ExamModel } from "./exam.model";
import { OfficialAnswerKeyModel } from "./official-answer-key.model";
import {
  createExamSchema,
  createOfficialAnswerKeySchema,
  examIdParamSchema,
  generateAnswerSheetsSchema,
  listExamsSchema,
  simulatedBlueprintQuerySchema,
} from "./exams.schemas";
import { getSimulatedBlueprint } from "./simulated-blueprint";

export const examsRouter = Router();

function getBaseUrl(req: any): string {
  return `${req.protocol}://${req.get("host")}`;
}

async function canAccessExamRecord(
  user: AuthUser,
  exam: { schoolId: unknown; classroomId: unknown },
): Promise<boolean> {
  const schoolOk = await canAccessSchool(user, String(exam.schoolId));
  if (!schoolOk) return false;
  if (user.role === "professor") {
    return canAccessClassroom(user, String(exam.classroomId));
  }
  return true;
}

async function buildOfficialAnswerKeyItems(examId: string) {
  const exam = await ExamModel.findById(examId).lean();
  if (!exam) {
    throw Object.assign(new Error("Prova nao encontrada."), { statusCode: 404 });
  }

  const questionIds = exam.questions.map((item) => item.questionId);
  const questions = await QuestionModel.find({ _id: { $in: questionIds } }).select("_id answer").lean();
  const byId = new Map(questions.map((question) => [String(question._id), question.answer]));
  const voided = new Set((exam.voidedQuestionIds ?? []).map((id) => String(id)));

  return exam.questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      order: item.order,
      questionId: item.questionId,
      correctAnswer: voided.has(String(item.questionId)) ? ("N/A" as const) : byId.get(String(item.questionId)) ?? "N/A",
      isVoided: voided.has(String(item.questionId)),
    }));
}

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

/** Lista cartões-resposta gerados para a prova (correção / acompanhamento). */
examsRouter.get("/:id/answer-sheets", requireAuth, async (req, res, next) => {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await ExamModel.findById(id).lean();
    if (!exam) {
      res.status(404).json({ message: "Prova nao encontrada." });
      return;
    }

    const allowed = await canAccessExamRecord(req.user!, exam);
    if (!allowed) {
      res.status(403).json({ message: "Acesso negado a esta prova." });
      return;
    }

    const sheets = await AnswerSheetModel.find({ examId: exam._id }).sort({ "studentSnapshot.fullName": 1 }).lean();
    res.json(
      sheets.map((s) => ({
        id: String(s._id),
        studentId: String(s.studentId),
        sheetCode: s.sheetCode,
        status: s.status,
        processingStatus: s.processingStatus,
        studentSnapshot: s.studentSnapshot,
        generatedAt: s.generatedAt,
        processedAt: s.processedAt ?? null,
      })),
    );
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

    if (req.user!.role === "professor") {
      if (!req.user!.schoolId) {
        res.status(403).json({ message: "Usuario sem escola vinculada." });
        return;
      }
      query.schoolId = req.user!.schoolId;
      const assigned = req.user!.classroomIds.filter((id) => Types.ObjectId.isValid(id));
      if (assigned.length === 0) {
        res.json([]);
        return;
      }
      const inAssigned = { $in: assigned.map((id) => new Types.ObjectId(id)) };
      if (filters.classroomId) {
        if (!assigned.includes(filters.classroomId)) {
          res.json([]);
          return;
        }
        query.classroomId = filters.classroomId;
      } else {
        query.classroomId = inAssigned;
      }
    } else if (req.user!.role === "coordenador") {
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

    const allowed = await canAccessExamRecord(req.user!, exam);
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
      sourceType: exam.sourceType ?? "QUESTION_BANK",
      status: exam.status ?? "DRAFT",
      examCode: exam.examCode ?? null,
      originalPdfFileId: exam.originalPdfFileId ? String(exam.originalPdfFileId) : null,
      officialAnswerKeyId: exam.officialAnswerKeyId ? String(exam.officialAnswerKeyId) : null,
      omrTemplateVersion: exam.omrTemplateVersion ?? 1,
      questionCount: exam.questionCount ?? exam.questions.length,
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

      const sourceType = data.sourceType ?? "QUESTION_BANK";
      let questionIds: string[] = data.questionIds ? [...data.questionIds] : [];
      const selected: string[] = [];

      if (sourceType === "QUESTION_BANK" && data.blueprint?.length) {
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

      if (sourceType === "QUESTION_BANK" && data.blueprintByAxis?.length) {
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

      const questions =
        sourceType === "PDF_IMPORT"
          ? []
          : questionIds.map((questionId, index) => ({
              questionId: new Types.ObjectId(questionId),
              order: index + 1,
            }));

      const examCode = await generateUniqueExamCode();
      const voided = (data.voidedQuestionIds ?? []).map((id) => new Types.ObjectId(id));
      const questionCount = sourceType === "PDF_IMPORT" ? data.questionCount! : questions.length;

      const exam = await ExamModel.create({
        schoolId: new Types.ObjectId(data.schoolId),
        classroomId: new Types.ObjectId(data.classroomId),
        title: data.title,
        discipline: data.discipline,
        grade: data.grade,
        framework: data.framework,
        examType: data.examType ?? "PERSONALIZADA",
        sourceType,
        status: data.status ?? "DRAFT",
        examCode,
        questionCount,
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

examsRouter.post(
  "/:id/files/original",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const { id } = examIdParamSchema.parse(req.params);
      const exam = await ExamModel.findById(id).lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }

      const allowed = await canAccessExamRecord(req.user!, exam);
      if (!allowed) {
        res.status(403).json({ message: "Acesso negado a esta prova." });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: "Envie o arquivo PDF da prova." });
        return;
      }

      if (req.file.mimetype !== "application/pdf") {
        res.status(400).json({ message: "Apenas PDF e aceito para a prova original." });
        return;
      }

      const saved = await saveBufferToStorage({
        buffer: req.file.buffer,
        relativeDir: `exams/${id}/original`,
        filename: req.file.originalname || "prova-original.pdf",
      });

      const file = await ExamFileModel.create({
        examId: exam._id,
        kind: "ORIGINAL_PDF",
        storageProvider: "LOCAL",
        storageKey: saved.storageKey,
        filename: req.file.originalname || "prova-original.pdf",
        mimeType: req.file.mimetype,
        sizeBytes: saved.sizeBytes,
        sha256: saved.sha256,
        uploadedBy: new Types.ObjectId(req.user!.id),
      });

      await ExamModel.updateOne(
        { _id: exam._id },
        {
          $set: {
            originalPdfFileId: file._id,
            sourceType: "PDF_IMPORT",
          },
        },
      );

      res.status(201).json({
        id: String(file._id),
        storageKey: file.storageKey,
        url: buildPublicFileUrl(getBaseUrl(req), file.storageKey),
      });
    } catch (error) {
      next(error);
    }
  },
);

examsRouter.get("/:id/answer-key", requireAuth, async (req, res, next) => {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await ExamModel.findById(id).lean();
    if (!exam) {
      res.status(404).json({ message: "Prova nao encontrada." });
      return;
    }

    const allowed = await canAccessExamRecord(req.user!, exam);
    if (!allowed) {
      res.status(403).json({ message: "Acesso negado a esta prova." });
      return;
    }

    const key = await OfficialAnswerKeyModel.findOne({ examId: exam._id, isActive: true }).lean();
    if (!key) {
      res.status(404).json({ message: "Gabarito oficial ainda nao publicado." });
      return;
    }

    res.json({
      id: String(key._id),
      examId: String(key.examId),
      version: key.version,
      isActive: key.isActive,
      publishedAt: key.publishedAt,
      notes: key.notes ?? null,
      items: key.items.map((item) => ({
        order: item.order,
        questionId: item.questionId ? String(item.questionId) : null,
        correctAnswer: item.correctAnswer,
        isVoided: item.isVoided,
      })),
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.post(
  "/:id/answer-key",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { id } = examIdParamSchema.parse(req.params);
      const data = createOfficialAnswerKeySchema.parse(req.body);
      const exam = await ExamModel.findById(id).lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }

      const allowed = await canAccessExamRecord(req.user!, exam);
      if (!allowed) {
        res.status(403).json({ message: "Acesso negado a esta prova." });
        return;
      }

      const items =
        data.items?.length
          ? data.items.map((item) => ({
              order: item.order,
              questionId: item.questionId ? new Types.ObjectId(item.questionId) : null,
              correctAnswer: item.correctAnswer,
              isVoided: item.isVoided ?? item.correctAnswer === "N/A",
            }))
          : await buildOfficialAnswerKeyItems(id);

      if (items.length !== exam.questionCount) {
        res.status(400).json({
          message: `O gabarito precisa conter exatamente ${exam.questionCount} item(ns).`,
        });
        return;
      }

      const sortedOrders = [...items].map((item) => item.order).sort((a, b) => a - b);
      const expected = Array.from({ length: exam.questionCount }, (_, index) => index + 1);
      if (JSON.stringify(sortedOrders) !== JSON.stringify(expected)) {
        res.status(400).json({ message: "Os itens do gabarito devem cobrir todas as ordens da prova." });
        return;
      }

      const lastVersion = await OfficialAnswerKeyModel.findOne({ examId: exam._id })
        .sort({ version: -1 })
        .select("version")
        .lean();

      await OfficialAnswerKeyModel.updateMany({ examId: exam._id, isActive: true }, { $set: { isActive: false } });
      const key = await OfficialAnswerKeyModel.create({
        examId: exam._id,
        version: (lastVersion?.version ?? 0) + 1,
        publishedAt: new Date(),
        publishedBy: new Types.ObjectId(req.user!.id),
        isActive: true,
        notes: data.notes,
        items,
      });

      await ExamModel.updateOne(
        { _id: exam._id },
        {
          $set: {
            officialAnswerKeyId: key._id,
            status: "READY",
          },
        },
      );

      res.status(201).json({
        id: String(key._id),
        version: key.version,
        totalItems: key.items.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

examsRouter.post(
  "/:id/answer-sheets/generate",
  requireAuth,
  requireRole("admin", "gestor", "coordenador", "professor"),
  async (req, res, next) => {
    try {
      const { id } = examIdParamSchema.parse(req.params);
      const data = generateAnswerSheetsSchema.parse(req.body ?? {});
      const exam = await ExamModel.findById(id).lean();
      if (!exam) {
        res.status(404).json({ message: "Prova nao encontrada." });
        return;
      }

      const allowed = await canAccessExamRecord(req.user!, exam);
      if (!allowed) {
        res.status(403).json({ message: "Acesso negado a esta prova." });
        return;
      }

      if (exam.questionCount > 40) {
        res.status(400).json({ message: "O MVP atual gera cartoes OMR para ate 40 questoes." });
        return;
      }

      const [school, classroom] = await Promise.all([
        SchoolModel.findById(exam.schoolId).lean(),
        ClassroomModel.findById(exam.classroomId).lean(),
      ]);
      if (!school || !classroom) {
        res.status(404).json({ message: "Escola ou turma vinculada nao encontrada." });
        return;
      }

      const studentQuery: Record<string, unknown> = { classroomId: exam.classroomId };
      if (data.studentIds?.length) {
        studentQuery._id = { $in: data.studentIds.map((studentId) => new Types.ObjectId(studentId)) };
      }

      const students = await StudentModel.find(studentQuery).sort({ fullName: 1 }).lean();
      if (!students.length) {
        res.status(400).json({ message: "Nenhum aluno encontrado para gerar os cartoes-resposta." });
        return;
      }

      for (const student of students) {
        const okStudent = await canAccessStudent(req.user!, String(student._id));
        if (!okStudent) {
          res.status(403).json({ message: `Acesso negado ao aluno ${student.fullName}.` });
          return;
        }
      }

      const sheets = [];
      for (const student of students) {
        const existing = await AnswerSheetModel.findOne({
          examId: exam._id,
          studentId: student._id,
        });

        if (existing) {
          sheets.push(existing);
          continue;
        }

        const sheetCode = await generateUniqueSheetCode();
        const qrPayload = JSON.stringify({
          sheetCode,
          examId: String(exam._id),
          studentId: String(student._id),
          examCode: exam.examCode,
          omrTemplateVersion: exam.omrTemplateVersion,
        });

        const created = await AnswerSheetModel.create({
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
            questionsPerPage: data.questionsPerPage ?? exam.questionCount,
            totalQuestions: exam.questionCount,
            optionsPerQuestion: 4,
            anchorSetVersion: exam.omrTemplateVersion,
          },
          status: "GENERATED",
          generatedAt: new Date(),
        });
        sheets.push(created);
      }

      const pdfBuffer = await buildAnswerSheetsPdf({
        exam: {
          title: exam.title,
          examCode: exam.examCode,
        },
        sheets: sheets.map((sheet) => ({
          sheetCode: sheet.sheetCode,
          qrPayload: sheet.qrPayload,
          studentSnapshot: sheet.studentSnapshot,
          classroomSnapshot: sheet.classroomSnapshot,
          schoolSnapshot: sheet.schoolSnapshot,
          layout: {
            totalQuestions: sheet.layout.totalQuestions,
            anchorSetVersion: sheet.layout.anchorSetVersion,
          },
        })),
      });

      const saved = await saveBufferToStorage({
        buffer: pdfBuffer,
        relativeDir: `exams/${id}/answer-sheets`,
        filename: `cartoes-resposta-${exam.examCode}.pdf`,
      });

      const file = await ExamFileModel.create({
        examId: exam._id,
        kind: "ANSWER_SHEET_BATCH_PDF",
        storageProvider: "LOCAL",
        storageKey: saved.storageKey,
        filename: `cartoes-resposta-${exam.examCode}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: saved.sizeBytes,
        sha256: saved.sha256,
        uploadedBy: new Types.ObjectId(req.user!.id),
      });

      await AnswerSheetModel.updateMany(
        { _id: { $in: sheets.map((sheet) => sheet._id) } },
        {
          $set: {
            batchFileId: file._id,
            status: "GENERATED",
          },
        },
      );

      res.status(201).json({
        batchFileId: String(file._id),
        url: buildPublicFileUrl(getBaseUrl(req), file.storageKey),
        totalSheets: sheets.length,
        answerSheetIds: sheets.map((sheet) => String(sheet._id)),
      });
    } catch (error) {
      next(error);
    }
  },
);
