/**
 * CLI da migracao normalizedName (conexao propria).
 *
 * Uso:
 *   DATABASE_URL=... npm run migrate:schools
 *   DATABASE_URL=... npm run migrate:schools -- --no-apply-index
 */

import mongoose from "mongoose";
import { connectDatabase } from "../config/db";
import {
  migrateSchoolNormalizedName,
  SchoolNormalizedNameCollisionError,
} from "../lib/migrations/migrate-school-normalized-name";

async function main() {
  const applyIndex = !process.argv.includes("--no-apply-index");

  await connectDatabase();
  console.log("Conectado ao MongoDB.");

  try {
    const { updated } = await migrateSchoolNormalizedName({ applyIndex });
    console.log(`Backfill: ${updated} documento(s) atualizado(s).`);
    console.log("Nenhuma colisão encontrada.");
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
