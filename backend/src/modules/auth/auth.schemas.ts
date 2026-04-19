import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalido."),
  password: z.string().min(6, "Senha deve ter no minimo 6 caracteres."),
});

export const bootstrapAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email("Email invalido."),
  password: z.string().min(6),
});
