import { Schema, Types, model } from "mongoose";

interface AnswerSheetDocument {
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  uploadUrl?: string;
  processingStatus: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
}

const answerSheetSchema = new Schema<AnswerSheetDocument>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    uploadUrl: { type: String },
    processingStatus: {
      type: String,
      required: true,
      default: "PENDING",
      enum: ["PENDING", "PROCESSING", "DONE", "ERROR"],
      index: true,
    },
  },
  { timestamps: true },
);

answerSheetSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const AnswerSheetModel = model<AnswerSheetDocument>("AnswerSheet", answerSheetSchema);
