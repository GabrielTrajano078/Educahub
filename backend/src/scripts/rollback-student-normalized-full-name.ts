/**
 * Rollback da migração normalizedFullName: remove o campo e o índice composto.
 *
 * Uso:
 *   DATABASE_URL=mongodb://127.0.0.1:27017/spas_saeb \
 *     npx tsx src/scripts/rollback-student-normalized-full-name.ts
 */

import mongoose from "mongoose";
import { StudentModel } from "../modules/students/student.model";
import { AppMigrationModel } from "../lib/migrations/migration-ledger.model";
import { STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1 } from "../lib/migrations/student-normalized-full-name.constants";

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Conectado ao MongoDB.");

  const collection = StudentModel.collection;

  try {
    await collection.dropIndex("classroomId_1_normalizedFullName_1");
    console.log("Índice classroomId_1_normalizedFullName_1 removido.");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 27 || code === 26) {
      console.log("Índice classroomId_1_normalizedFullName_1 não encontrado (já removido).");
    } else {
      throw err;
    }
  }

  const dropResult = await collection.updateMany({}, { $unset: { normalizedFullName: "" } });
  console.log(`Campos normalizedFullName removidos: ${dropResult.modifiedCount} documento(s).`);

  const ledger = await AppMigrationModel.deleteOne({ name: STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1 });
  console.log(`Entrada do ledger removida: ${ledger.deletedCount}`);

  await mongoose.disconnect();
  console.log("Rollback concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
