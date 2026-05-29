import { normalizePersonName } from "./normalize-person-name";

/** Nome canônico de escola (QODE-40). */
export function normalizeSchoolName(name: string): string {
  return normalizePersonName(name);
}
