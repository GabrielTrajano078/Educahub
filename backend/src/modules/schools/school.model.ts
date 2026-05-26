import { Schema, model } from "mongoose";

interface SchoolDocument {
  name: string;
  normalizedName: string;
  city?: string;
  /** Código do município para agregação da secretaria/gestão municipal. */
  municipalityCode?: string;
}

const schoolSchema = new Schema<SchoolDocument>(
  {
    name: { type: String, required: true, index: true },
    normalizedName: { type: String, required: true, index: true },
    city: { type: String },
    municipalityCode: { type: String, index: true },
  },
  { timestamps: true },
);

schoolSchema.index(
  { municipalityCode: 1, normalizedName: 1 },
  {
    unique: true,
    partialFilterExpression: { municipalityCode: { $exists: true, $type: "string" } },
  },
);

export const SchoolModel = model<SchoolDocument>("School", schoolSchema);
