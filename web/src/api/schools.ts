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
