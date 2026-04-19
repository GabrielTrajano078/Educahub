import { z } from "zod";
import {
  answerSchema,
  curriculumAxisSchema,
  disciplineSchema,
  frameworkSchema,
  gradeSchema,
  objectIdSchema,
} from "../common/schemas";

export const listQuestionsSchema = z.object({
  discipline: disciplineSchema.optional(),
  grade: gradeSchema.optional(),
  framework: frameworkSchema.optional(),
  descriptor: z.string().min(1).optional(),
  axis: curriculumAxisSchema.optional(),
});

export const createQuestionSchema = z.object({
  discipline: disciplineSchema,
  grade: gradeSchema,
  framework: frameworkSchema.optional().default("SAEB"),
  descriptor: z.string().min(1),
  axis: curriculumAxisSchema.optional(),
  prompt: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  answer: answerSchema,
});

export const questionSuggestionsSchema = z.object({
  classroomId: objectIdSchema,
  discipline: disciplineSchema,
  grade: gradeSchema,
  framework: frameworkSchema.optional().default("SAEB"),
  weakThreshold: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
