import { z } from "zod";
import {
  disciplineSchema,
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
    questionIds: z.array(objectIdSchema).min(1).optional(),
    blueprint: z
      .array(
        z.object({
          descriptor: z.string().min(1),
          count: z.number().int().min(1).max(20),
        }),
      )
      .optional(),
  })
  .refine((v) => Boolean(v.questionIds?.length || v.blueprint?.length), {
    message: "Informe questionIds ou blueprint.",
  });

export const listExamsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  classroomId: objectIdSchema.optional(),
  discipline: disciplineSchema.optional(),
  grade: gradeSchema.optional(),
});
