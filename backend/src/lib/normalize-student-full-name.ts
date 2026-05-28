import { normalizePersonName } from "./normalize-person-name";

/** Nome canônico do aluno para leitura, busca e unicidade por turma (QODE-41). */
export function normalizeStudentFullName(fullName: string): string {
  return normalizePersonName(fullName);
}
