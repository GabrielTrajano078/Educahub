import { z } from "zod";

export const schoolSchema = z.object({
  _id: z.string(),
  name: z.string(),
  city: z.string().optional(),
  municipalityCode: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type School = z.infer<typeof schoolSchema>;
