/**
 * Rollback da migração normalizedName: remove o campo e restaura índices do modelo legado.
 *
 * Uso:
 *   DATABASE_URL=mongodb://127.0.0.1:27017/spas_saeb \
 *     npx ts-node --transpile-only src/scripts/rollback-school-normalized-name.ts
 */

import mongoose from "mongoose";
import { SchoolModel } from "../modules/schools/school.model";

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Conectado ao MongoDB.");

  const collection = SchoolModel.collection;

  try {
    await collection.dropIndex("municipalityCode_1_normalizedName_1");
    console.log("Índice municipalityCode_1_normalizedName_1 removido.");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 27 || code === 26) {
      console.log("Índice municipalityCode_1_normalizedName_1 não encontrado (já removido).");
    } else {
      throw err;
    }
  }

  const dropResult = await collection.updateMany(
    {},
    { $unset: { normalizedName: "" } },
  );
  console.log(`Campos normalizedName removidos: ${dropResult.modifiedCount} documento(s).`);

  try {
    await collection.createIndex({ municipalityCode: 1, name: 1 });
    console.log("Índice municipalityCode_1_name_1 recriado.");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 85 || code === 86) {
      console.log("Índice municipalityCode_1_name_1 já existe.");
    } else {
      throw err;
    }
  }

  await mongoose.disconnect();
  console.log("Rollback concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
