import { z } from "zod";

export const createSchoolSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2).optional(),
  municipalityCode: z.string().min(2).optional(),
});

export const listSchoolsSchema = z.object({
  nameContains: z.string().trim().max(200).optional(),
});
