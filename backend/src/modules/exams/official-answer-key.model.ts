import { Schema, Types, model } from "mongoose";

interface OfficialAnswerKeyItem {
  order: number;
  questionId?: Types.ObjectId | null;
  correctAnswer: "A" | "B" | "C" | "D" | "N/A";
  isVoided: boolean;
}

interface OfficialAnswerKeyDocument {
  examId: Types.ObjectId;
  version: number;
  publishedAt: Date;
  publishedBy: Types.ObjectId;
  isActive: boolean;
  items: OfficialAnswerKeyItem[];
  notes?: string;
}

const answerKeyItemSchema = new Schema<OfficialAnswerKeyItem>(
  {
    order: { type: Number, required: true, min: 1 },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", default: null },
    correctAnswer: { type: String, required: true, enum: ["A", "B", "C", "D", "N/A"] },
    isVoided: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const officialAnswerKeySchema = new Schema<OfficialAnswerKeyDocument>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    publishedAt: { type: Date, required: true, default: Date.now },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, required: true, default: true, index: true },
    items: { type: [answerKeyItemSchema], required: true, validate: (value: OfficialAnswerKeyItem[]) => value.length > 0 },
    notes: { type: String },
  },
  { timestamps: true },
);

officialAnswerKeySchema.index({ examId: 1, version: 1 }, { unique: true });
officialAnswerKeySchema.index({ examId: 1, isActive: 1 });

export const OfficialAnswerKeyModel = model<OfficialAnswerKeyDocument>(
  "OfficialAnswerKey",
  officialAnswerKeySchema,
);
