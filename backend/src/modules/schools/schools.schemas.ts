import { z } from "zod";

/** normalizedName é derivado no servidor; nunca aceito no body de entrada. */
export const createSchoolSchema = z
  .object({
    name: z.string().min(2),
    city: z.string().min(2).optional(),
    municipalityCode: z
      .string()
      .regex(/^\d{7}$/, "Codigo IBGE deve ter 7 digitos.")
      .optional(),
  })
  .strict();

export const listSchoolsSchema = z.object({
  nameContains: z.string().trim().max(200).optional(),
});

export const schoolIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export const updateSchoolSchema = createSchoolSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "Nenhum campo para atualizar.",
});
