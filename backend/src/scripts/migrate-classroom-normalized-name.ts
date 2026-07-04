/**
 * CLI da migração normalizedName de turmas.
 *
 * Uso:
 *   npm run migrate:classes
 *   npm run migrate:classes -- --force
 *   npm run migrate:classes -- --no-apply-index
 */

import mongoose from "mongoose";
import { connectDatabase } from "../config/db";
import {
  ClassroomNormalizedNameCollisionError,
  migrateClassroomNormalizedName,
} from "../lib/migrations/migrate-classroom-normalized-name";

async function main() {
  const applyIndex = !process.argv.includes("--no-apply-index");
  const force = process.argv.includes("--force");

  await connectDatabase();
  console.log("Conectado ao MongoDB.");

  try {
    const result = await migrateClassroomNormalizedName({ applyIndex, force });
    if (result.skipped) {
      console.log(`Migração ${result.migrationId} já aplicada (use --force para reexecutar).`);
      await mongoose.disconnect();
      return;
    }
    console.log(`Backfill: ${result.updated} documento(s) atualizado(s).`);
    console.log("Nenhuma colisão encontrada.");
    console.log(`Registrada em app_migrations: ${result.migrationId}`);
    if (applyIndex) {
      console.log("Índice schoolId + normalizedName aplicado.");
    } else {
      console.log("Índices não alterados (--no-apply-index).");
    }
  } catch (err) {
    if (err instanceof ClassroomNormalizedNameCollisionError) {
      console.error("Colisões (schoolId + normalizedName):");
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
