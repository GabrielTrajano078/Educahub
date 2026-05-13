import { apiFetch } from "@/lib/api-client";

export type Student = {
  _id: string;
  schoolId: string;
  classroomId: string;
  fullName: string;
  registrationCode: string;
};

export async function listStudents(params?: {
  schoolId?: string;
  classroomId?: string;
  grade?: "5" | "9";
  fullNameContains?: string;
}): Promise<Student[]> {
  const sp = new URLSearchParams();
  if (params?.schoolId) sp.set("schoolId", params.schoolId);
  if (params?.classroomId) sp.set("classroomId", params.classroomId);
  if (params?.grade) sp.set("grade", params.grade);
  if (params?.fullNameContains?.trim()) sp.set("fullNameContains", params.fullNameContains.trim());
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

export async function deleteStudent(id: string): Promise<void> {
  await apiFetch<null>(`/api/students/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type UpdateStudentBody = {
  fullName?: string;
  registrationCode?: string;
  classroomId?: string;
};

export async function updateStudent(id: string, body: UpdateStudentBody): Promise<void> {
  await apiFetch<null>(`/api/students/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
