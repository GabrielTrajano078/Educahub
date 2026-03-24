import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { QuestionModel } from "../questions/question.model";
import { ExamModel } from "./exam.model";
import { createExamSchema, listExamsSchema } from "./exams.schemas";

export const examsRouter = Router();

examsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listExamsSchema.parse(req.query);
    const query = {
      ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
      ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
      ...(filters.discipline ? { discipline: filters.discipline } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
    };

    const exams = await ExamModel.find(query).sort({ createdAt: -1 }).lean();
    res.json(exams);
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

      let questionIds = data.questionIds ?? [];

      if (data.blueprint?.length) {
        const selected: string[] = [];

        for (const block of data.blueprint) {
          const docs = await QuestionModel.find({
            discipline: data.discipline,
            grade: data.grade,
            framework: data.framework,
            descriptor: block.descriptor,
            _id: { $nin: selected },
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

      const questions = questionIds.map((questionId, index) => ({
        questionId: new Types.ObjectId(questionId),
        order: index + 1,
      }));

      const exam = await ExamModel.create({
        schoolId: new Types.ObjectId(data.schoolId),
        classroomId: new Types.ObjectId(data.classroomId),
        title: data.title,
        discipline: data.discipline,
        grade: data.grade,
        framework: data.framework,
        createdBy: new Types.ObjectId(req.user!.id),
        questions,
      });

      res.status(201).json({ id: String(exam._id), totalQuestions: exam.questions.length });
    } catch (error) {
      next(error);
    }
  },
);
