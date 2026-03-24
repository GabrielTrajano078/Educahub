import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { createQuestionSchema, listQuestionsSchema } from "./questions.schemas";
import { QuestionModel } from "./question.model";

export const questionsRouter = Router();

questionsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const filters = listQuestionsSchema.parse(req.query);
    const query = {
      ...(filters.discipline ? { discipline: filters.discipline } : {}),
      ...(filters.grade ? { grade: filters.grade } : {}),
      ...(filters.framework ? { framework: filters.framework } : {}),
      ...(filters.descriptor ? { descriptor: filters.descriptor } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    };

    const questions = await QuestionModel.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("discipline grade framework descriptor difficulty prompt optionA optionB optionC optionD")
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
      difficulty: data.difficulty,
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
