import { apiFetch } from "@/lib/api-client";

export type Student = {
  _id: string;
  schoolId: string;
  classroomId: string;
  fullName: string;
  registrationCode: string;
};

export async function listStudents(params?: { schoolId?: string; classroomId?: string }): Promise<Student[]> {
  const sp = new URLSearchParams();
  if (params?.schoolId) sp.set("schoolId", params.schoolId);
  if (params?.classroomId) sp.set("classroomId", params.classroomId);
  const q = sp.toString();
  return apiFetch<Student[]>(`/api/students${q ? `?${q}` : ""}`);
}

export type CreateStudentBody = {
  schoolId: string;
  classroomId: string;
  fullName: string;
  registrationCode: string;
};

export async function createStudent(body: CreateStudentBody): Promise<{ id: string }> {
  return apiFetch("/api/students", { method: "POST", body });
}
