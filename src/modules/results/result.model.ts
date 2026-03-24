import { Schema, Types, model } from "mongoose";

interface ResultDocument {
  answerSheetId: Types.ObjectId;
  questionId: Types.ObjectId;
  markedAnswer: "A" | "B" | "C" | "D" | "X" | "N/A";
  isCorrect: boolean;
}

const resultSchema = new Schema<ResultDocument>(
  {
    answerSheetId: { type: Schema.Types.ObjectId, ref: "AnswerSheet", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    markedAnswer: { type: String, required: true, enum: ["A", "B", "C", "D", "X", "N/A"] },
    isCorrect: { type: Boolean, required: true },
  },
  { timestamps: true },
);

resultSchema.index({ answerSheetId: 1, questionId: 1 }, { unique: true });

export const ResultModel = model<ResultDocument>("Result", resultSchema);
