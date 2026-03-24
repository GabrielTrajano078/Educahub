import { z } from "zod";
import { markedAnswerSchema, objectIdSchema } from "../common/schemas";

export const registerAnswerSheetSchema = z.object({
  examId: objectIdSchema,
  studentId: objectIdSchema,
  uploadUrl: z.string().url().optional(),
});

export const submitCorrectionSchema = z.object({
  answerSheetId: objectIdSchema,
  answers: z.array(
    z.object({
      questionId: objectIdSchema,
      markedAnswer: markedAnswerSchema,
    }),
  ),
});

export const diagnosisByClassroomSchema = z.object({
  classroomId: objectIdSchema,
  examId: objectIdSchema.optional(),
});
