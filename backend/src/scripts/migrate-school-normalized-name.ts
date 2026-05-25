/**
 * CLI da migração normalizedName (conexão própria).
 *
 * Uso:
 *   npm run migrate:schools
 *   npm run migrate:schools -- --force
 *   npm run migrate:schools -- --no-apply-index
 *
 * A migração v1 fica registrada em `app_migrations` e não reexecuta no startup/CLI
 * até usar --force ou criar uma nova migração (ex.: school-normalized-name-v2).
 */

import mongoose from "mongoose";
import { connectDatabase } from "../config/db";
import {
  migrateSchoolNormalizedName,
  SchoolNormalizedNameCollisionError,
} from "../lib/migrations/migrate-school-normalized-name";

async function main() {
  const applyIndex = !process.argv.includes("--no-apply-index");
  const force = process.argv.includes("--force");

  await connectDatabase();
  console.log("Conectado ao MongoDB.");

  try {
    const result = await migrateSchoolNormalizedName({ applyIndex, force });
    if (result.skipped) {
      console.log(`Migração ${result.migrationId} já aplicada (use --force para reexecutar).`);
      await mongoose.disconnect();
      return;
    }
    console.log(`Backfill: ${result.updated} documento(s) atualizado(s).`);
    console.log("Nenhuma colisão encontrada.");
    console.log(`Registrada em app_migrations: ${result.migrationId}`);
    if (applyIndex) {
      console.log("Índices de normalizedName aplicados.");
    } else {
      console.log("Índices não alterados (--no-apply-index).");
    }
  } catch (err) {
    if (err instanceof SchoolNormalizedNameCollisionError) {
      console.error("Colisões (municipalityCode + normalizedName):");
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
