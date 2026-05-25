import { normalizeSchoolName } from "../../lib/normalize-school-name";

/** Garante normalizedName na resposta JSON mesmo em documentos legados sem o campo persistido. */
export function serializeSchool<T extends { name: string; normalizedName?: string }>(
  school: T,
): T & { normalizedName: string } {
  return {
    ...school,
    normalizedName: school.normalizedName ?? normalizeSchoolName(school.name),
  };
}
