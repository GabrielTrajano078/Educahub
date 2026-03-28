import { apiFetch } from "@/lib/api-client";

export type DescriptorStat = {
  descriptor: string;
  axis: string | null;
  accuracy: number;
  total: number;
  correct: number;
};

export type AxisStat = {
  axis: string;
  accuracy: number;
  total: number;
  correct: number;
};

export async function fetchClassroomRanking(classroomId: string, examId?: string): Promise<
  {
    studentId: string;
    studentName: string;
    answerSheetId: string;
    totalEffective: number;
    correct: number;
    percentage: number;
  }[]
> {
  const sp = examId ? `?examId=${examId}` : "";
  return apiFetch(`/api/results/classroom/${classroomId}/ranking${sp}`);
}

export async function fetchClassroomHeatmap(
  classroomId: string,
  examId?: string,
): Promise<{
  masteryThreshold: number;
  weakThreshold: number;
  dominated: string[];
  notDominated: string[];
  intermediate: string[];
  byDescriptor: DescriptorStat[];
}> {
  const sp = examId ? `?examId=${examId}` : "";
  return apiFetch(`/api/results/classroom/${classroomId}/heatmap${sp}`);
}

export async function fetchClassroomReport(classroomId: string, examId?: string): Promise<{
  classroom: { id: string; name: string; grade: string; schoolId: string } | null;
  byDescriptor: DescriptorStat[];
  byAxis: AxisStat[];
  masteredDescriptors: string[];
  notMasteredDescriptors: string[];
  interventions: { descriptor: string; axis: string | null; suggestion: string }[];
}> {
  const sp = examId ? `?examId=${examId}` : "";
  return apiFetch(`/api/results/reports/classroom/${classroomId}${sp}`);
}

export async function fetchSchoolSummary(
  schoolId: string,
  examId?: string,
): Promise<{
  schoolId: string;
  classrooms: {
    classroomId: string;
    name: string;
    grade: string;
    descriptorCount: number;
    meanAccuracyAcrossDescriptors: number;
    byDescriptor: DescriptorStat[];
  }[];
}> {
  const sp = examId ? `?examId=${examId}` : "";
  return apiFetch(`/api/results/school/${schoolId}/summary${sp}`);
}

export async function fetchMunicipalitySummary(
  municipalityCode: string,
  examId?: string,
): Promise<{
  municipalityCode: string;
  schools: {
    schoolId: string;
    name: string;
    byDescriptor: DescriptorStat[];
    criticalDescriptors: DescriptorStat[];
  }[];
}> {
  const sp = new URLSearchParams({ municipalityCode });
  if (examId) sp.set("examId", examId);
  return apiFetch(`/api/results/municipality/summary?${sp}`);
}

export async function uploadAnswerSheetScan(answerSheetId: string, file: File): Promise<{ id: string; url: string; processingStatus: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/api/results/answer-sheets/${answerSheetId}/scans`, { method: "POST", body: fd });
}

export async function processAnswerSheetScan(
  answerSheetId: string,
  scanId: string,
  selectForResult = true,
): Promise<{
  scanId: string;
  totalEffective: number;
  correct: number;
  percentage: number;
  omrMetrics: { confidence: number };
  parsedMarks: { order: number; detectedAnswer: string; confidence: number }[];
}> {
  return apiFetch(`/api/results/answer-sheets/${answerSheetId}/scans/process`, {
    method: "POST",
    body: { scanId, selectForResult },
  });
}
