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
  framework: "SAEB" | "SPAS";
  examType: "PERSONALIZADA" | "RECUPERACAO" | "SIMULADO";
  /** Código impresso no cartão-resposta. */
  examCode: string;
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
    framework: { type: String, required: true, enum: ["SAEB", "SPAS"], index: true },
    examType: {
      type: String,
      required: true,
      enum: ["PERSONALIZADA", "RECUPERACAO", "SIMULADO"],
      default: "PERSONALIZADA",
      index: true,
    },
    examCode: { type: String, required: true, unique: true, sparse: true, index: true },
    voidedQuestionIds: { type: [Schema.Types.ObjectId], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questions: { type: [examQuestionSchema], required: true, validate: (value: ExamQuestion[]) => value.length > 0 },
  },
  { timestamps: true },
);

export const ExamModel = model<ExamDocument>("Exam", examSchema);
