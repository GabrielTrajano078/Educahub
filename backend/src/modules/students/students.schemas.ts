import { z } from "zod";
import { gradeSchema, objectIdSchema } from "../common/schemas";

export const createStudentSchema = z.object({
  schoolId: objectIdSchema,
  classroomId: objectIdSchema,
  fullName: z.string().trim().min(2),
  registrationCode: z.string().trim().min(2),
});

export const listStudentsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  classroomId: objectIdSchema.optional(),
  grade: gradeSchema.optional(),
  fullNameContains: z.string().trim().max(200).optional(),
});
