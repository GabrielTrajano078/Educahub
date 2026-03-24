import { z } from "zod";
import { objectIdSchema } from "../common/schemas";

export const createStudentSchema = z.object({
  schoolId: objectIdSchema,
  classroomId: objectIdSchema,
  fullName: z.string().min(2),
  registrationCode: z.string().min(2),
});

export const listStudentsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  classroomId: objectIdSchema.optional(),
});
