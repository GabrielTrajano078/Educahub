import { Schema, Types, model } from "mongoose";

interface ParsedMark {
  order: number;
  detectedAnswer: "A" | "B" | "C" | "D" | "X" | "N/A";
  confidence: number;
  reason: "SINGLE_MARK" | "MULTIPLE_MARKS" | "BLANK" | "LOW_CONFIDENCE";
}

interface OcrMetrics {
  rotationDegrees: number;
  alignmentScore: number;
  shadowScore?: number;
  detectedAnchors: number;
  confidence: number;
}

interface AnswerSheetScanDocument {
  answerSheetId: Types.ObjectId;
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  storageProvider: "LOCAL" | "S3" | "GCS";
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: Types.ObjectId;
  scanType: "PHOTO" | "SCAN" | "PDF_PAGE";
  processingStatus: "PENDING" | "PROCESSING" | "DONE" | "ERROR" | "NEEDS_REVIEW";
  selectedForResult: boolean;
  omrMetrics?: OcrMetrics | null;
  parsedMarks: ParsedMark[];
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const parsedMarkSchema = new Schema<ParsedMark>(
  {
    order: { type: Number, required: true, min: 1 },
    detectedAnswer: { type: String, required: true, enum: ["A", "B", "C", "D", "X", "N/A"] },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    reason: { type: String, required: true, enum: ["SINGLE_MARK", "MULTIPLE_MARKS", "BLANK", "LOW_CONFIDENCE"] },
  },
  { _id: false },
);

const omrMetricsSchema = new Schema<OcrMetrics>(
  {
    rotationDegrees: { type: Number, required: true },
    alignmentScore: { type: Number, required: true, min: 0, max: 1 },
    shadowScore: { type: Number, min: 0, max: 1 },
    detectedAnchors: { type: Number, required: true, min: 0 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false },
);

const answerSheetScanSchema = new Schema<AnswerSheetScanDocument>(
  {
    answerSheetId: { type: Schema.Types.ObjectId, ref: "AnswerSheet", required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    storageProvider: { type: String, required: true, enum: ["LOCAL", "S3", "GCS"], default: "LOCAL" },
    storageKey: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scanType: { type: String, required: true, enum: ["PHOTO", "SCAN", "PDF_PAGE"], default: "PHOTO" },
    processingStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "DONE", "ERROR", "NEEDS_REVIEW"],
      default: "PENDING",
      index: true,
    },
    selectedForResult: { type: Boolean, required: true, default: false },
    omrMetrics: { type: omrMetricsSchema, default: null },
    parsedMarks: { type: [parsedMarkSchema], default: [] },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true },
);

answerSheetScanSchema.index({ answerSheetId: 1, createdAt: -1 });
answerSheetScanSchema.index({ answerSheetId: 1, selectedForResult: 1 });

export const AnswerSheetScanModel = model<AnswerSheetScanDocument>(
  "AnswerSheetScan",
  answerSheetScanSchema,
);
