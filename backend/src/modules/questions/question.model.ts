import { Schema, model } from "mongoose";

interface QuestionDocument {
  discipline: "LP" | "MAT";
  grade: "5" | "9";
  framework: "SAEB";
  descriptor: string;
  /** Eixo curricular para relatórios (desempenho por eixo). */
  axis?: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: "A" | "B" | "C" | "D";
}

const questionSchema = new Schema<QuestionDocument>(
  {
    discipline: { type: String, required: true, enum: ["LP", "MAT"], index: true },
    grade: { type: String, required: true, enum: ["5", "9"], index: true },
    framework: { type: String, required: true, enum: ["SAEB"], index: true },
    descriptor: { type: String, required: true, index: true },
    axis: { type: String, index: true },
    prompt: { type: String, required: true },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    answer: { type: String, required: true, enum: ["A", "B", "C", "D"] },
  },
  { timestamps: true },
);

questionSchema.index({
  discipline: 1,
  grade: 1,
  framework: 1,
  descriptor: 1,
});
questionSchema.index({ discipline: 1, grade: 1, framework: 1, axis: 1 });

export const QuestionModel = model<QuestionDocument>("Question", questionSchema);
