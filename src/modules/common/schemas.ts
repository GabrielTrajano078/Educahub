import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID invalido.");
export const disciplineSchema = z.enum(["LP", "MAT"]);
export const gradeSchema = z.enum(["5", "9"]);
export const frameworkSchema = z.enum(["SAEB", "SPAS"]);
export const difficultySchema = z.enum(["FACIL", "MEDIO", "DIFICIL"]);
export const answerSchema = z.enum(["A", "B", "C", "D"]);
export const markedAnswerSchema = z.enum(["A", "B", "C", "D", "X", "N/A"]);
