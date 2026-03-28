import { apiFetch } from "@/lib/api-client";
import { schoolSchema, type School } from "@/schemas/school";
import { z } from "zod";

export async function listSchools(): Promise<School[]> {
  const data = await apiFetch<unknown>("/api/schools");
  return z.array(schoolSchema).parse(data);
}
