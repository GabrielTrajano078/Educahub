import { apiFetch } from "@/lib/api-client";

export type ExamListItem = {
  _id: string;
  schoolId: string;
  classroomId: string;
  title: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework: "SAEB" | "SPAS";
  examType?: string;
  status?: string;
  examCode?: string;
  questionCount?: number;
  createdAt?: string;
};

export async function listExams(params?: {
  schoolId?: string;
  classroomId?: string;
  discipline?: "LP" | "MAT";
  grade?: "5" | "9";
}): Promise<ExamListItem[]> {
  const sp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const q = sp.toString();
  return apiFetch(`/api/exams${q ? `?${q}` : ""}`);
}

export type ExamDetail = ExamListItem & {
  sourceType?: "QUESTION_BANK" | "PDF_IMPORT";
  questions: Array<{
    order: number;
    questionId: string;
    discipline?: string;
    grade?: string;
    framework?: string;
    descriptor?: string;
    axis?: string;
    difficulty?: string;
    prompt?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    answer?: string;
    missing?: boolean;
  }>;
  voidedQuestionIds?: string[];
};

export async function fetchExam(id: string): Promise<ExamDetail> {
  return apiFetch(`/api/exams/${id}`);
}

export type CreateExamBody = {
  schoolId: string;
  classroomId: string;
  title: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework: "SAEB" | "SPAS";
  examType?: "PERSONALIZADA" | "RECUPERACAO" | "SIMULADO";
  sourceType?: "QUESTION_BANK" | "PDF_IMPORT";
  status?: string;
  questionCount?: number;
  questionIds?: string[];
  blueprint?: { descriptor: string; count: number }[];
  blueprintByAxis?: { axis: string; count: number }[];
  voidedQuestionIds?: string[];
};

export async function createExam(body: CreateExamBody): Promise<{ id: string; examCode: string; totalQuestions: number }> {
  return apiFetch("/api/exams", { method: "POST", body });
}

export type SimulatedBlueprintResponse = {
  framework: string;
  discipline: string;
  grade: string;
  blueprintByAxis: { axis: string; count: number }[];
  totalQuestions: number;
};

export async function fetchSimulatedBlueprint(params: {
  framework: "SAEB" | "SPAS";
  discipline: "LP" | "MAT";
  grade: "5" | "9";
}): Promise<SimulatedBlueprintResponse> {
  const sp = new URLSearchParams(params);
  return apiFetch(`/api/exams/blueprint/simulado?${sp}`);
}

export async function publishAnswerKey(examId: string, body?: { notes?: string }): Promise<{ id: string; version: number; totalItems: number }> {
  return apiFetch(`/api/exams/${examId}/answer-key`, { method: "POST", body: body ?? {} });
}

export async function generateAnswerSheets(
  examId: string,
  body?: { studentIds?: string[]; questionsPerPage?: number },
): Promise<{ batchFileId: string; url: string; totalSheets: number; answerSheetIds: string[] }> {
  return apiFetch(`/api/exams/${examId}/answer-sheets/generate`, { method: "POST", body: body ?? {} });
}

export type AnswerSheetRow = {
  id: string;
  studentId: string;
  sheetCode: string;
  status: string;
  processingStatus: string;
  studentSnapshot: { fullName: string; registrationCode: string };
  generatedAt: string;
  processedAt: string | null;
};

export async function listExamAnswerSheets(examId: string): Promise<AnswerSheetRow[]> {
  return apiFetch(`/api/exams/${examId}/answer-sheets`);
}
