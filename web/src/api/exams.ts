import { apiFetch } from "@/lib/api-client";

export type ExamListItem = {
  _id: string;
  schoolId: string;
  classroomId: string;
  title: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework: "SAEB";
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
  framework?: "SAEB";
  descriptor?: string;
  axis?: string;
}): Promise<ExamListItem[]> {
  const sp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const q = sp.toString();
  const path = q ? `/api/exams?${q}` : "/api/exams";
  return apiFetch(path);
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

export type ExamTypeApi =
  | "DIAGNOSTICO_INICIAL"
  | "SIMULADO_1"
  | "SIMULADO_2"
  | "SIMULADO_3"
  | "SIMULADO_4"
  | "DIAGNOSTICO_FINAL";

export type CreateExamBody = {
  schoolId: string;
  classroomId: string;
  title: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework?: "SAEB";
  examType?: ExamTypeApi;
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

export async function updateExam(id: string, body: CreateExamBody): Promise<{ id: string }> {
  return apiFetch(`/api/exams/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

export async function deleteExam(id: string): Promise<void> {
  await apiFetch<null>(`/api/exams/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type SimulatedBlueprintResponse = {
  framework: string;
  discipline: string;
  grade: string;
  blueprintByAxis: { axis: string; count: number }[];
  totalQuestions: number;
};

export async function fetchSimulatedBlueprint(params: {
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

export async function uploadExamOriginalPdf(examId: string, file: File): Promise<{ id: string; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/api/exams/${examId}/files/original`, { method: "POST", body: fd });
}
