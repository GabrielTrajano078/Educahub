import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "ID invalido.");
export const disciplineSchema = z.enum(["LP", "MAT"]);
export const gradeSchema = z.enum(["5", "9"]);
export const frameworkSchema = z.enum(["SAEB"]);
export const answerSchema = z.enum(["A", "B", "C", "D"]);
export const markedAnswerSchema = z.enum(["A", "B", "C", "D", "X", "N/A"]);
export const examTypeSchema = z.enum([
  "DIAGNOSTICO_INICIAL",
  "SIMULADO_1",
  "SIMULADO_2",
  "SIMULADO_3",
  "SIMULADO_4",
  "DIAGNOSTICO_FINAL",
]);
export const examSourceTypeSchema = z.enum(["QUESTION_BANK", "PDF_IMPORT"]);
export const examStatusSchema = z.enum(["DRAFT", "READY", "APPLIED", "CLOSED"]);
export const fileStorageProviderSchema = z.enum(["LOCAL", "S3", "GCS"]);
export const examFileKindSchema = z.enum([
  "ORIGINAL_PDF",
  "ANSWER_SHEET_BATCH_PDF",
  "ANSWER_SHEET_SINGLE_PDF",
]);
export const answerSheetStatusSchema = z.enum(["GENERATED", "PRINTED", "SUBMITTED", "PROCESSED", "ERROR"]);
export const processingStatusSchema = z.enum(["PENDING", "PROCESSING", "DONE", "ERROR"]);
export const scanTypeSchema = z.enum(["PHOTO", "SCAN", "PDF_PAGE"]);
export const scanReviewStatusSchema = z.enum(["PENDING", "PROCESSING", "DONE", "ERROR", "NEEDS_REVIEW"]);
export const correctionSourceSchema = z.enum(["MANUAL", "OMR"]);

export const curriculumAxisSchema = z.enum([
  "LEITURA",
  "INTERPRETACAO",
  "GENEROS_TEXTUAIS",
  "LINGUA_ESTUDO",
  "NUMEROS",
  "ALGEBRA",
  "GEOMETRIA",
  "ESTATISTICA",
  "GRANDEZAS_MEDIDAS",
]);
