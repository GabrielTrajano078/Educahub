import { Schema, Types, model } from "mongoose";

interface StudentDocument {
  schoolId: Types.ObjectId;
  classroomId: Types.ObjectId;
  fullName: string;
  normalizedFullName: string;
  registrationCode: string;
}

const studentSchema = new Schema<StudentDocument>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    classroomId: { type: Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    fullName: { type: String, required: true },
    normalizedFullName: { type: String, required: true, index: true },
    registrationCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

studentSchema.index({ classroomId: 1, normalizedFullName: 1 }, { unique: true });

export const StudentModel = model<StudentDocument>("Student", studentSchema);
