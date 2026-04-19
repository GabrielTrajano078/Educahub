import { Schema, Types, model } from "mongoose";

interface AnswerSheetDocument {
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  sheetCode: string;
  pdfFileId: Types.ObjectId | null;
  batchFileId: Types.ObjectId | null;
  qrPayload: string;
  studentSnapshot: {
    fullName: string;
    registrationCode: string;
  };
  classroomSnapshot: {
    name: string;
    grade: "5" | "9";
  };
  schoolSnapshot: {
    name: string;
    city?: string;
  };
  layout: {
    questionsPerPage: number;
    totalQuestions: number;
    optionsPerQuestion: 4;
    anchorSetVersion: number;
  };
  status: "GENERATED" | "PRINTED" | "SUBMITTED" | "PROCESSED" | "ERROR";
  generatedAt: Date;
  processedAt?: Date | null;
  uploadUrl?: string;
  processingStatus: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
}

const snapshotStudentSchema = new Schema(
  {
    fullName: { type: String, required: true },
    registrationCode: { type: String, required: true },
  },
  { _id: false },
);

const snapshotClassroomSchema = new Schema(
  {
    name: { type: String, required: true },
    grade: { type: String, required: true, enum: ["5", "9"] },
  },
  { _id: false },
);

const snapshotSchoolSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String },
  },
  { _id: false },
);

const answerSheetLayoutSchema = new Schema(
  {
    questionsPerPage: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    optionsPerQuestion: { type: Number, required: true, enum: [4], default: 4 },
    anchorSetVersion: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

const answerSheetSchema = new Schema<AnswerSheetDocument>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    sheetCode: { type: String, required: true, unique: true, index: true },
    pdfFileId: { type: Schema.Types.ObjectId, ref: "ExamFile", default: null },
    batchFileId: { type: Schema.Types.ObjectId, ref: "ExamFile", default: null },
    qrPayload: { type: String, required: true },
    studentSnapshot: { type: snapshotStudentSchema, required: true },
    classroomSnapshot: { type: snapshotClassroomSchema, required: true },
    schoolSnapshot: { type: snapshotSchoolSchema, required: true },
    layout: { type: answerSheetLayoutSchema, required: true },
    status: {
      type: String,
      required: true,
      default: "GENERATED",
      enum: ["GENERATED", "PRINTED", "SUBMITTED", "PROCESSED", "ERROR"],
      index: true,
    },
    generatedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
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
answerSheetSchema.index({ examId: 1, status: 1 });

export const AnswerSheetModel = model<AnswerSheetDocument>("AnswerSheet", answerSheetSchema);
