import { z } from "zod";
import {
  curriculumAxisSchema,
  disciplineSchema,
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
    framework: frameworkSchema,
    examType: examTypeSchema.optional(),
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
      const flags = [
        Boolean(v.questionIds?.length),
        Boolean(v.blueprint?.length),
        Boolean(v.blueprintByAxis?.length),
      ].filter(Boolean).length;
      return flags === 1;
    },
    { message: "Informe exatamente um de: questionIds, blueprint ou blueprintByAxis." },
  );

export const listExamsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  classroomId: objectIdSchema.optional(),
  discipline: disciplineSchema.optional(),
  grade: gradeSchema.optional(),
});

export const simulatedBlueprintQuerySchema = z.object({
  framework: frameworkSchema,
  discipline: disciplineSchema,
  grade: gradeSchema,
});

export const examIdParamSchema = z.object({
  id: objectIdSchema,
});
