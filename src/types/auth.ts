export type UserRole = "admin" | "professor" | "coordenador" | "gestor";

export interface AuthUser {
  id: string;
  role: UserRole;
  schoolId: string | null;
}
