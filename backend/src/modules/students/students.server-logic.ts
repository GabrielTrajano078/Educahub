import { Types } from "mongoose";
import type { AuthUser } from "../../types/auth";
import { ClassroomModel } from "../classes/classroom.model";

export function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, number> } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000,
  );
}

/** Mensagem 409 conforme índice violado (matrícula global vs nome na turma). */
export function studentDuplicateKeyMessage(error: unknown): string {
  if (!isDuplicateKeyError(error)) {
    return "Ja existe aluno com este codigo de matricula.";
  }
  const pattern = error.keyPattern ?? {};
  if (pattern.normalizedFullName === 1 || (pattern.classroomId === 1 && Object.keys(pattern).length >= 2)) {
    return "Ja existe aluno com este nome na turma informada.";
  }
  return "Ja existe aluno com este codigo de matricula.";
}

export async function classroomIdsForGrade(
  grade: "5" | "9",
  filtersSchoolId: string | undefined,
  user: AuthUser,
): Promise<Types.ObjectId[]> {
  const cq: Record<string, unknown> = { grade };
  if (filtersSchoolId) {
    cq.schoolId = filtersSchoolId;
  } else if (user.role === "coordenador" || user.role === "professor") {
    if (!user.schoolId || !Types.ObjectId.isValid(user.schoolId)) {
      return [];
    }
    cq.schoolId = user.schoolId;
  }
  const cls = await ClassroomModel.find(cq).select("_id").lean();
  return cls.map((c) => c._id);
}
