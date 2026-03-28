import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const bootstrapFormSchema = z.object({
  fullName: z.string().min(2, "Nome muito curto."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Mínimo de 6 caracteres."),
});

export type BootstrapFormValues = z.infer<typeof bootstrapFormSchema>;

export const userSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(["admin", "professor", "coordenador", "gestor"]),
  schoolId: z.string().nullable(),
  municipalityCode: z.string().nullable(),
  classroomIds: z.array(z.string()).default([]),
});

export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
