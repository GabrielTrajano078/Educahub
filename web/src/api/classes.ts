import { apiFetch } from "@/lib/api-client";

export type Classroom = {
  _id: string;
  schoolId: string;
  name: string;
  grade: "5" | "9";
};

export async function listClassrooms(params?: { schoolId?: string; grade?: "5" | "9" }): Promise<Classroom[]> {
  const sp = new URLSearchParams();
  if (params?.schoolId) sp.set("schoolId", params.schoolId);
  if (params?.grade) sp.set("grade", params.grade);
  const q = sp.toString();
  return apiFetch<Classroom[]>(`/api/classes${q ? `?${q}` : ""}`);
}
