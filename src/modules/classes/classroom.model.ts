import { Schema, Types, model } from "mongoose";

interface ClassroomDocument {
  schoolId: Types.ObjectId;
  name: string;
  grade: "5" | "9";
}

const classroomSchema = new Schema<ClassroomDocument>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true },
    grade: { type: String, required: true, enum: ["5", "9"], index: true },
  },
  { timestamps: true },
);

classroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const ClassroomModel = model<ClassroomDocument>("Classroom", classroomSchema);
