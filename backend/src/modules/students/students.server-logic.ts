import { Types } from "mongoose";
import type { AuthUser } from "../../types/auth";
import { ClassroomModel } from "../classes/classroom.model";

export function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000,
  );
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
