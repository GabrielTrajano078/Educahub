import { Schema, model } from "mongoose";

interface SchoolDocument {
  name: string;
  city?: string;
  /** Código do município para agregação da secretaria/gestão municipal. */
  municipalityCode?: string;
}

const schoolSchema = new Schema<SchoolDocument>(
  {
    name: { type: String, required: true, index: true },
    city: { type: String },
    municipalityCode: { type: String, index: true },
  },
  { timestamps: true },
);

schoolSchema.index({ municipalityCode: 1, name: 1 });

export const SchoolModel = model<SchoolDocument>("School", schoolSchema);
