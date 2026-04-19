import { z } from "zod";
import {
  curriculumAxisSchema,
  disciplineSchema,
  examSourceTypeSchema,
  examStatusSchema,
  examTypeSchema,
  frameworkSchema,
  gradeSchema,
  objectIdSchema,
} from "../common/schemas";

export const createExamSchema = z
  .object({
    schoolId: objectIdSchema,
    classroomId: objectIdSchema,
    title: z.string().min(3),
    discipline: disciplineSchema,
    grade: gradeSchema,
    framework: frameworkSchema.optional().default("SAEB"),
    examType: examTypeSchema.optional(),
    sourceType: examSourceTypeSchema.optional(),
    status: examStatusSchema.optional(),
    questionCount: z.coerce.number().int().min(1).max(40).optional(),
    voidedQuestionIds: z.array(objectIdSchema).optional(),
    questionIds: z.array(objectIdSchema).min(1).optional(),
    blueprint: z
      .array(
        z.object({
          descriptor: z.string().min(1),
          count: z.number().int().min(1).max(20),
        }),
      )
      .optional(),
    blueprintByAxis: z
      .array(
        z.object({
          axis: curriculumAxisSchema,
          count: z.number().int().min(1).max(20),
        }),
      )
      .optional(),
  })
  .refine(
    (v) => {
      if (v.sourceType === "PDF_IMPORT") {
        return Boolean(v.questionCount);
      }
      const flags = [
        Boolean(v.questionIds?.length),
        Boolean(v.blueprint?.length),
        Boolean(v.blueprintByAxis?.length),
      ].filter(Boolean).length;
      return flags === 1;
    },
    { message: "Informe questionCount para PDF importado ou exatamente um de: questionIds, blueprint ou blueprintByAxis." },
  );

export const listExamsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  classroomId: objectIdSchema.optional(),
  discipline: disciplineSchema.optional(),
  grade: gradeSchema.optional(),
});

export const simulatedBlueprintQuerySchema = z.object({
  discipline: disciplineSchema,
  grade: gradeSchema,
});

export const examIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createOfficialAnswerKeySchema = z.object({
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        order: z.number().int().min(1),
        questionId: objectIdSchema.optional(),
        correctAnswer: z.enum(["A", "B", "C", "D", "N/A"]),
        isVoided: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const generateAnswerSheetsSchema = z.object({
  studentIds: z.array(objectIdSchema).optional(),
  questionsPerPage: z.coerce.number().int().min(1).max(40).optional(),
});
