import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET deve ter no minimo 8 caracteres"),
  DATABASE_URL: z.string().url("DATABASE_URL deve ser uma URL valida de conexao MongoDB"),
});

export const env = envSchema.parse(process.env);
