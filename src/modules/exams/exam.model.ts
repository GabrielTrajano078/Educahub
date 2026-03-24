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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questions: { type: [examQuestionSchema], required: true, validate: (value: ExamQuestion[]) => value.length > 0 },
  },
  { timestamps: true },
);

export const ExamModel = model<ExamDocument>("Exam", examSchema);
