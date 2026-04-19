import { Schema, Types, model } from "mongoose";

interface ExamQuestion {
  questionId: Types.ObjectId;
  order: number;
}

interface ExamDocument {
  schoolId: Types.ObjectId;
  classroomId: Types.ObjectId;
  title: string;
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework: "SAEB";
  examType:
    | "DIAGNOSTICO_INICIAL"
    | "SIMULADO_1"
    | "SIMULADO_2"
    | "SIMULADO_3"
    | "SIMULADO_4"
    | "DIAGNOSTICO_FINAL";
  sourceType: "QUESTION_BANK" | "PDF_IMPORT";
  status: "DRAFT" | "READY" | "APPLIED" | "CLOSED";
  /** Código impresso no cartão-resposta. */
  examCode: string;
  originalPdfFileId: Types.ObjectId | null;
  officialAnswerKeyId: Types.ObjectId | null;
  omrTemplateVersion: number;
  questionCount: number;
  /** Questões anuladas após aplicação (gabarito ignora / marcação N/A). */
  voidedQuestionIds: Types.ObjectId[];
  createdBy: Types.ObjectId;
  questions: ExamQuestion[];
}

const examQuestionSchema = new Schema<ExamQuestion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    order: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const examSchema = new Schema<ExamDocument>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    classroomId: { type: Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    title: { type: String, required: true },
    discipline: { type: String, required: true, enum: ["LP", "MAT"], index: true },
    grade: { type: String, required: true, enum: ["5", "9"], index: true },
    framework: { type: String, required: true, enum: ["SAEB"], index: true },
    examType: {
      type: String,
      required: true,
      enum: [
        "DIAGNOSTICO_INICIAL",
        "SIMULADO_1",
        "SIMULADO_2",
        "SIMULADO_3",
        "SIMULADO_4",
        "DIAGNOSTICO_FINAL",
      ],
      default: "DIAGNOSTICO_INICIAL",
      index: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: ["QUESTION_BANK", "PDF_IMPORT"],
      default: "QUESTION_BANK",
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "READY", "APPLIED", "CLOSED"],
      default: "DRAFT",
      index: true,
    },
    examCode: { type: String, required: true, unique: true, sparse: true, index: true },
    originalPdfFileId: { type: Schema.Types.ObjectId, ref: "ExamFile", default: null },
    officialAnswerKeyId: { type: Schema.Types.ObjectId, ref: "OfficialAnswerKey", default: null },
    omrTemplateVersion: { type: Number, required: true, default: 1, min: 1 },
    questionCount: { type: Number, required: true, min: 1 },
    voidedQuestionIds: { type: [Schema.Types.ObjectId], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questions: {
      type: [examQuestionSchema],
      default: [],
      validate: {
        validator(this: ExamDocument, value: ExamQuestion[]) {
          return this.sourceType === "PDF_IMPORT" || value.length > 0;
        },
        message: "Provas do banco de questoes precisam conter ao menos uma questao.",
      },
    },
  },
  { timestamps: true },
);

examSchema.index({ classroomId: 1, status: 1, createdAt: -1 });

export const ExamModel = model<ExamDocument>("Exam", examSchema);
