import { z } from "zod";
import { markedAnswerSchema, objectIdSchema } from "../common/schemas";

export const registerAnswerSheetSchema = z.object({
  examId: objectIdSchema,
  studentId: objectIdSchema,
  uploadUrl: z.string().url().optional(),
});

export const submitCorrectionSchema = z.object({
  answerSheetId: objectIdSchema,
  answers: z
    .array(
      z.object({
        questionId: objectIdSchema,
        markedAnswer: markedAnswerSchema,
      }),
    )
    .min(1),
});

export const submitMarksByOrderSchema = z.object({
  answerSheetId: objectIdSchema,
  marks: z.array(
    z.object({
      order: z.number().int().min(1),
      markedAnswer: markedAnswerSchema,
    }),
  ),
});

export const diagnosisByClassroomSchema = z.object({
  classroomId: objectIdSchema,
  examId: objectIdSchema.optional(),
});

export const studentSummarySchema = z.object({
  studentId: objectIdSchema,
  examId: objectIdSchema.optional(),
});

export const classroomRankingSchema = z.object({
  classroomId: objectIdSchema,
  examId: objectIdSchema.optional(),
});

export const classroomHeatmapSchema = z.object({
  classroomId: objectIdSchema,
  examId: objectIdSchema.optional(),
  masteryThreshold: z.coerce.number().min(0).max(100).optional(),
  weakThreshold: z.coerce.number().min(0).max(100).optional(),
});

export const schoolSummarySchema = z.object({
  schoolId: objectIdSchema,
  examId: objectIdSchema.optional(),
});

export const municipalitySummarySchema = z.object({
  municipalityCode: z.string().min(2),
  examId: objectIdSchema.optional(),
});

export const classroomReportSchema = z.object({
  classroomId: objectIdSchema,
  examId: objectIdSchema.optional(),
});

export const answerSheetIdParamSchema = z.object({
  id: objectIdSchema,
});

export const patchAnswerSheetSchema = z.object({
  uploadUrl: z.string().url().optional(),
  processingStatus: z.enum(["PENDING", "PROCESSING", "DONE", "ERROR"]).optional(),
});
