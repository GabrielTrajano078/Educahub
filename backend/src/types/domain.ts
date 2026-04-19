export type Discipline = "LP" | "MAT";
export type Grade = "5" | "9";
export type Framework = "SAEB";
export type AnswerOption = "A" | "B" | "C" | "D";
export type MarkedAnswer = AnswerOption | "X" | "N/A";

/** Eixos para relatórios SAEB (LP e MAT). */
export type CurriculumAxis =
  | "LEITURA"
  | "INTERPRETACAO"
  | "GENEROS_TEXTUAIS"
  | "LINGUA_ESTUDO"
  | "NUMEROS"
  | "ALGEBRA"
  | "GEOMETRIA"
  | "ESTATISTICA"
  | "GRANDEZAS_MEDIDAS";

export type ExamType =
  | "DIAGNOSTICO_INICIAL"
  | "SIMULADO_1"
  | "SIMULADO_2"
  | "SIMULADO_3"
  | "SIMULADO_4"
  | "DIAGNOSTICO_FINAL";
export type ExamSourceType = "QUESTION_BANK" | "PDF_IMPORT";
export type ExamStatus = "DRAFT" | "READY" | "APPLIED" | "CLOSED";
export type FileStorageProvider = "LOCAL" | "S3" | "GCS";
export type ExamFileKind = "ORIGINAL_PDF" | "ANSWER_SHEET_BATCH_PDF" | "ANSWER_SHEET_SINGLE_PDF";
export type AnswerSheetStatus = "GENERATED" | "PRINTED" | "SUBMITTED" | "PROCESSED" | "ERROR";
export type ProcessingStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";
export type ScanType = "PHOTO" | "SCAN" | "PDF_PAGE";
export type ScanReviewStatus = ProcessingStatus | "NEEDS_REVIEW";
export type CorrectionSource = "MANUAL" | "OMR";
