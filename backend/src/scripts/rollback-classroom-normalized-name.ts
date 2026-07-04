/**
 * Rollback da migração normalizedName de turmas.
 *
 * Uso:
 *   DATABASE_URL=mongodb://127.0.0.1:27017/spas_saeb \
 *     npx tsx src/scripts/rollback-classroom-normalized-name.ts
 */

import mongoose from "mongoose";
import { ClassroomModel } from "../modules/classes/classroom.model";
import { AppMigrationModel } from "../lib/migrations/migration-ledger.model";
import { CLASSROOM_NORMALIZED_NAME_MIGRATION_V1 } from "../lib/migrations/classroom-normalized-name.constants";

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Conectado ao MongoDB.");

  const collection = ClassroomModel.collection;

  try {
    await collection.dropIndex("schoolId_1_normalizedName_1");
    console.log("Índice schoolId_1_normalizedName_1 removido.");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 27 || code === 26) {
      console.log("Índice schoolId_1_normalizedName_1 não encontrado (já removido).");
    } else {
      throw err;
    }
  }

  const dropResult = await collection.updateMany({}, { $unset: { normalizedName: "" } });
  console.log(`Campos normalizedName removidos: ${dropResult.modifiedCount} documento(s).`);

  try {
    await collection.createIndex({ schoolId: 1, name: 1 }, { unique: true });
    console.log("Índice schoolId_1_name_1 recriado.");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 85 || code === 86) {
      console.log("Índice schoolId_1_name_1 já existe.");
    } else {
      throw err;
    }
  }

  const ledger = await AppMigrationModel.deleteOne({ name: CLASSROOM_NORMALIZED_NAME_MIGRATION_V1 });
  console.log(`Entrada do ledger removida: ${ledger.deletedCount}`);

  await mongoose.disconnect();
  console.log("Rollback concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
