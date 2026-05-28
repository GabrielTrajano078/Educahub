/**
 * CLI da migração normalizedFullName (conexão própria).
 *
 * Uso:
 *   npm run migrate:students
 *   npm run migrate:students -- --force
 *   npm run migrate:students -- --no-apply-index
 */

import mongoose from "mongoose";
import { connectDatabase } from "../config/db";
import {
  migrateStudentNormalizedFullName,
  StudentNormalizedFullNameCollisionError,
} from "../lib/migrations/migrate-student-normalized-full-name";

async function main() {
  const applyIndex = !process.argv.includes("--no-apply-index");
  const force = process.argv.includes("--force");

  await connectDatabase();
  console.log("Conectado ao MongoDB.");

  try {
    const result = await migrateStudentNormalizedFullName({ applyIndex, force });
    if (result.skipped) {
      console.log(`Migração ${result.migrationId} já aplicada (use --force para reexecutar).`);
      await mongoose.disconnect();
      return;
    }
    console.log(`Backfill: ${result.updated} documento(s) atualizado(s).`);
    console.log("Nenhuma colisão encontrada.");
    console.log(`Registrada em app_migrations: ${result.migrationId}`);
    if (applyIndex) {
      console.log("Índice classroomId + normalizedFullName aplicado.");
    } else {
      console.log("Índices não alterados (--no-apply-index).");
    }
  } catch (err) {
    if (err instanceof StudentNormalizedFullNameCollisionError) {
      console.error("Colisões (classroomId + normalizedFullName):");
      console.error(JSON.stringify(err.collisions, null, 2));
      await mongoose.disconnect();
      process.exit(2);
    }
    throw err;
  }

  await mongoose.disconnect();
  console.log("Migração concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
