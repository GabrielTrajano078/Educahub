export type Discipline = "LP" | "MAT";
export type Grade = "5" | "9";
export type Framework = "SAEB" | "SPAS";
export type Difficulty = "FACIL" | "MEDIO" | "DIFICIL";
export type AnswerOption = "A" | "B" | "C" | "D";
export type MarkedAnswer = AnswerOption | "X" | "N/A";

/** Eixos para relatórios SAEB/SPA-S (LP e MAT). */
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

export type ExamType = "PERSONALIZADA" | "RECUPERACAO" | "SIMULADO";
