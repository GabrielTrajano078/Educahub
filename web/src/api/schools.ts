import { apiFetch } from "@/lib/api-client";
import { schoolSchema, type School } from "@/schemas/school";
import { z } from "zod";

export async function listSchools(params?: { nameContains?: string }): Promise<School[]> {
  const sp = new URLSearchParams();
  if (params?.nameContains?.trim()) sp.set("nameContains", params.nameContains.trim());
  const q = sp.toString();
  const data = await apiFetch<unknown>(`/api/schools${q ? `?${q}` : ""}`);
  return z.array(schoolSchema).parse(data);
}

export type CreateSchoolBody = {
  name: string;
  city?: string;
  municipalityCode?: string;
};

export async function createSchool(body: CreateSchoolBody): Promise<{ id: string }> {
  return apiFetch("/api/schools", { method: "POST", body });
}

export type UpdateSchoolBody = Partial<CreateSchoolBody>;

export async function fetchSchool(id: string): Promise<School> {
  return apiFetch(`/api/schools/${id}`);
}

export async function updateSchool(id: string, body: UpdateSchoolBody): Promise<void> {
  await apiFetch(`/api/schools/${id}`, { method: "PATCH", body });
}

export async function deleteSchool(id: string): Promise<void> {
  await apiFetch(`/api/schools/${id}`, { method: "DELETE" });
}
