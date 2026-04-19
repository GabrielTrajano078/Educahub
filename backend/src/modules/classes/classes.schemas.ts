import { z } from "zod";
import { gradeSchema, objectIdSchema } from "../common/schemas";

export const createClassroomSchema = z.object({
  schoolId: objectIdSchema,
  name: z.string().min(1),
  grade: gradeSchema,
});

export const listClassroomsSchema = z.object({
  schoolId: objectIdSchema.optional(),
  grade: gradeSchema.optional(),
});
