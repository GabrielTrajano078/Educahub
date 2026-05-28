import { z } from "zod";

export const studentSchema = z.object({
  _id: z.string(),
  schoolId: z.string(),
  classroomId: z.string(),
  fullName: z.string(),
  normalizedFullName: z.string(),
  registrationCode: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Student = z.infer<typeof studentSchema>;

/** Nome visível em telas alimentadas por GET (QODE-41). */
export function studentDisplayName(student: Pick<Student, "normalizedFullName">): string {
  return student.normalizedFullName;
}
