import { Schema, model } from "mongoose";

interface AppMigrationDocument {
  /** Identificador estável da migração (ex.: school-normalized-name-v1). */
  name: string;
  appliedAt: Date;
}

const appMigrationSchema = new Schema<AppMigrationDocument>(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "app_migrations" },
);

export const AppMigrationModel = model<AppMigrationDocument>("AppMigration", appMigrationSchema);
