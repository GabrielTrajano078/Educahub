export type UserRole = "admin" | "professor" | "coordenador" | "gestor";

export interface AuthUser {
  id: string;
  role: UserRole;
  schoolId: string | null;
  municipalityCode: string | null;
  /** IDs de turma atribuídos ao professor (vazio para outros papéis). */
  classroomIds: string[];
}
