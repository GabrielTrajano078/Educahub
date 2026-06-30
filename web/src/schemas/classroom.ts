import { z } from "zod";

export const classroomSchema = z.object({
  _id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  normalizedName: z.string(),
  grade: z.enum(["5", "9"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Classroom = z.infer<typeof classroomSchema>;

/** Nome visível em telas alimentadas por GET (QODE-42). */
export function classroomDisplayName(classroom: Pick<Classroom, "normalizedName">): string {
  return classroom.normalizedName;
}

/** Label de select/listagem com ano (ex.: `5A MANHA (5º)`). */
export function classroomOptionLabel(classroom: Pick<Classroom, "normalizedName" | "grade">): string {
  return `${classroom.normalizedName} (${classroom.grade}º)`;
}
