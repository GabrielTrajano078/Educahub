import { z } from "zod";
import {
  answerSchema,
  difficultySchema,
  disciplineSchema,
  frameworkSchema,
  gradeSchema,
} from "../common/schemas";

export const listQuestionsSchema = z.object({
  discipline: disciplineSchema.optional(),
  grade: gradeSchema.optional(),
  framework: frameworkSchema.optional(),
  descriptor: z.string().min(1).optional(),
  difficulty: difficultySchema.optional(),
});

export const createQuestionSchema = z.object({
  discipline: disciplineSchema,
  grade: gradeSchema,
  framework: frameworkSchema,
  descriptor: z.string().min(1),
  difficulty: difficultySchema,
  prompt: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  answer: answerSchema,
});
