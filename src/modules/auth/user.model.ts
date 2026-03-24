import { Schema, model } from "mongoose";
import { UserRole } from "../../types/auth";

interface UserDocument {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  schoolId: string | null;
}

const userSchema = new Schema<UserDocument>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "professor", "coordenador", "gestor"],
    },
    schoolId: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserModel = model<UserDocument>("User", userSchema);
