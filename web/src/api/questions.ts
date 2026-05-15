import { apiFetch } from "@/lib/api-client";

export type QuestionListItem = {
  _id: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework: "SAEB";
  descriptor: string;
  axis?: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type QuestionDetail = QuestionListItem & {
  answer: "A" | "B" | "C" | "D";
};

export async function listQuestionDescriptors(params: {
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework?: "SAEB";
}): Promise<{ descriptors: string[] }> {
  const sp = new URLSearchParams({
    discipline: params.discipline,
    grade: params.grade,
    framework: params.framework ?? "SAEB",
  });
  return apiFetch(`/api/questions/descriptors?${sp}`);
}

export async function listQuestions(params: {
  discipline?: "LP" | "MAT";
  grade?: "5" | "9";
  framework?: "SAEB";
  descriptor?: string;
  axis?: string;
}): Promise<QuestionListItem[]> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const q = sp.toString();
  return apiFetch(`/api/questions${q ? `?${q}` : ""}`);
}

export async function fetchQuestion(id: string): Promise<QuestionDetail> {
  return apiFetch(`/api/questions/${id}`);
}

export type QuestionSuggestion = {
  descriptor: string;
  axis: string | null;
  accuracy: number;
  total: number;
  correct: number;
};

export async function fetchQuestionSuggestions(params: {
  classroomId: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework?: "SAEB";
}): Promise<{ weakDescriptors: QuestionSuggestion[]; weakThreshold: number }> {
  const sp = new URLSearchParams({
    classroomId: params.classroomId,
    discipline: params.discipline,
    grade: params.grade,
    framework: params.framework ?? "SAEB",
  });
  return apiFetch(`/api/questions/suggestions?${sp}`);
}

export type CreateQuestionBody = {
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework?: "SAEB";
  descriptor: string;
  axis?: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: "A" | "B" | "C" | "D";
};

export type UpdateQuestionBody = Partial<CreateQuestionBody>;

export async function createQuestion(body: CreateQuestionBody): Promise<{ id: string }> {
  return apiFetch("/api/questions", { method: "POST", body });
}

export async function updateQuestion(id: string, body: UpdateQuestionBody): Promise<{ ok: boolean }> {
  return apiFetch(`/api/questions/${id}`, { method: "PATCH", body });
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiFetch(`/api/questions/${id}`, { method: "DELETE" });
}
