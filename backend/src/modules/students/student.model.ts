import { Schema, Types, model } from "mongoose";

interface StudentDocument {
  schoolId: Types.ObjectId;
  classroomId: Types.ObjectId;
  fullName: string;
  registrationCode: string;
}

const studentSchema = new Schema<StudentDocument>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    classroomId: { type: Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    fullName: { type: String, required: true },
    registrationCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

export const StudentModel = model<StudentDocument>("Student", studentSchema);
