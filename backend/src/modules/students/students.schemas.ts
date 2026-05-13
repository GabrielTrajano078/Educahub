import { z } from "zod";
import { gradeSchema, objectIdSchema } from "../common/schemas";

export const createStudentSchema = z.object({
  schoolId: objectIdSchema,
  classroomId: objectIdSchema,
  fullName: z.string().trim().min(2),
  registrationCode: z.string().trim().min(2),
});

export const updateStudentSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    registrationCode: z.string().trim().min(2).optional(),
    classroomId: objectIdSchema.optional(),
  })
  .refine((b) => b.fullName !== undefined || b.registrationCode !== undefined || b.classroomId !== undefined, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const listStudentsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  classroomId: objectIdSchema.optional(),
  grade: gradeSchema.optional(),
  fullNameContains: z.string().trim().max(200).optional(),
});
