import { z } from "zod";
import { gradeSchema, objectIdSchema } from "../common/schemas";

export const createClassroomSchema = z.object({
  schoolId: objectIdSchema,
  name: z.string().trim().min(1),
  grade: gradeSchema,
});

export const listClassroomsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  grade: gradeSchema.optional(),
  nameContains: z.string().trim().max(200).optional(),
});

export const classroomIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const updateClassroomSchema = z
  .object({
    schoolId: objectIdSchema.optional(),
    name: z.string().trim().min(1).optional(),
    grade: gradeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo para atualizar.",
  });
