import { Schema, model } from "mongoose";

interface SchoolDocument {
  name: string;
  city?: string;
}

const schoolSchema = new Schema<SchoolDocument>(
  {
    name: { type: String, required: true, index: true },
    city: { type: String },
  },
  { timestamps: true },
);

export const SchoolModel = model<SchoolDocument>("School", schoolSchema);
