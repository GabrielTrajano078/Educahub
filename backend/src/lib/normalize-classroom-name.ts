import { normalizePersonName } from "./normalize-person-name";

/** Nome canônico de turma para leitura, busca e unicidade por escola (QODE-42). */
export function normalizeClassroomName(name: string): string {
  return normalizePersonName(name);
}
