import { apiFetch } from "@/lib/api-client";

export type Classroom = {
  _id: string;
  schoolId: string;
  name: string;
  grade: "5" | "9";
};

export async function listClassrooms(params?: {
  schoolId?: string;
  grade?: "5" | "9";
  nameContains?: string;
}): Promise<Classroom[]> {
  const sp = new URLSearchParams();
  if (params?.schoolId) sp.set("schoolId", params.schoolId);
  if (params?.grade) sp.set("grade", params.grade);
  if (params?.nameContains?.trim()) sp.set("nameContains", params.nameContains.trim());
  const q = sp.toString();
  return apiFetch<Classroom[]>(`/api/classes${q ? `?${q}` : ""}`);
}

export type CreateClassroomBody = {
  schoolId: string;
  name: string;
  grade: "5" | "9";
};

export async function createClassroom(body: CreateClassroomBody): Promise<{ id: string }> {
  return apiFetch("/api/classes", { method: "POST", body });
}

export type UpdateClassroomBody = Partial<CreateClassroomBody>;

export async function fetchClassroom(id: string): Promise<Classroom> {
  return apiFetch(`/api/classes/${id}`);
}

export async function updateClassroom(id: string, body: UpdateClassroomBody): Promise<void> {
  await apiFetch(`/api/classes/${id}`, { method: "PATCH", body });
}

export async function deleteClassroom(id: string): Promise<void> {
  await apiFetch(`/api/classes/${id}`, { method: "DELETE" });
}
