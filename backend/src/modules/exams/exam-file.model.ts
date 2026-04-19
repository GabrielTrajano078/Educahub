import { Schema, Types, model } from "mongoose";

interface ExamFileDocument {
  examId: Types.ObjectId;
  kind: "ORIGINAL_PDF" | "ANSWER_SHEET_BATCH_PDF" | "ANSWER_SHEET_SINGLE_PDF";
  storageProvider: "LOCAL" | "S3" | "GCS";
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy: Types.ObjectId;
}

const examFileSchema = new Schema<ExamFileDocument>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    kind: {
      type: String,
      required: true,
      enum: ["ORIGINAL_PDF", "ANSWER_SHEET_BATCH_PDF", "ANSWER_SHEET_SINGLE_PDF"],
      index: true,
    },
    storageProvider: { type: String, required: true, enum: ["LOCAL", "S3", "GCS"], default: "LOCAL" },
    storageKey: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    sha256: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

examFileSchema.index({ examId: 1, kind: 1, createdAt: -1 });

export const ExamFileModel = model<ExamFileDocument>("ExamFile", examFileSchema);
