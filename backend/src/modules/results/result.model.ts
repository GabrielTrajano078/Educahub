import { Schema, Types, model } from "mongoose";

interface ResultDocument {
  answerSheetId: Types.ObjectId;
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  questionId?: Types.ObjectId | null;
  order: number;
  officialAnswer: "A" | "B" | "C" | "D" | "N/A";
  markedAnswer: "A" | "B" | "C" | "D" | "X" | "N/A";
  isCorrect: boolean;
  score: 0 | 1;
  correctionSource: "MANUAL" | "OMR";
  answerSheetScanId?: Types.ObjectId | null;
  confidence?: number | null;
}

const resultSchema = new Schema<ResultDocument>(
  {
    answerSheetId: { type: Schema.Types.ObjectId, ref: "AnswerSheet", required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", default: null },
    order: { type: Number, required: true, min: 1 },
    officialAnswer: { type: String, required: true, enum: ["A", "B", "C", "D", "N/A"] },
    markedAnswer: { type: String, required: true, enum: ["A", "B", "C", "D", "X", "N/A"] },
    isCorrect: { type: Boolean, required: true },
    score: { type: Number, required: true, enum: [0, 1] },
    correctionSource: { type: String, required: true, enum: ["MANUAL", "OMR"], default: "MANUAL" },
    answerSheetScanId: { type: Schema.Types.ObjectId, ref: "AnswerSheetScan", default: null },
    confidence: { type: Number, default: null, min: 0, max: 1 },
  },
  { timestamps: true },
);

resultSchema.index({ answerSheetId: 1, order: 1 }, { unique: true });
resultSchema.index({ examId: 1, studentId: 1, order: 1 });

export const ResultModel = model<ResultDocument>("Result", resultSchema);
