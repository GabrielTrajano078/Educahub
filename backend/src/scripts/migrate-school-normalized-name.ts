/**
 * Script de migração: backfill de normalizedName nas escolas existentes.
 *
 * Uso:
 *   DATABASE_URL=mongodb://127.0.0.1:27017/spas_saeb \
 *     npx ts-node --transpile-only src/scripts/migrate-school-normalized-name.ts
 *
 * O script:
 *   1. Encontra todas as escolas sem normalizedName.
 *   2. Calcula normalizedName para cada uma.
 *   3. Detecta colisões (mesmo municipalityCode + normalizedName) e as reporta
 *      sem atualizar as duplicatas.
 *   4. Atualiza as escolas sem colisão.
 */

import mongoose from "mongoose";
import { normalizeSchoolName } from "../lib/normalize-school-name";
import { SchoolModel } from "../modules/schools/school.model";

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Conectado ao MongoDB.");

  const schools = await SchoolModel.find({ normalizedName: { $exists: false } }).lean();
  console.log(`Escolas sem normalizedName: ${schools.length}`);

  if (schools.length === 0) {
    console.log("Nada a migrar.");
    await mongoose.disconnect();
    return;
  }

  type Candidate = { _id: mongoose.Types.ObjectId; name: string; municipalityCode?: string; normalizedName: string };
  const candidates: Candidate[] = schools.map((s) => ({
    _id: s._id as mongoose.Types.ObjectId,
    name: s.name,
    municipalityCode: s.municipalityCode,
    normalizedName: normalizeSchoolName(s.name),
  }));

  // Detectar colisões entre os candidatos e documentos já existentes
  const collisions: Candidate[] = [];
  const toUpdate: Candidate[] = [];

  for (const c of candidates) {
    const collision = await SchoolModel.exists({
      _id: { $ne: c._id },
      municipalityCode: c.municipalityCode ?? null,
      normalizedName: c.normalizedName,
    });
    if (collision) {
      collisions.push(c);
    } else {
      toUpdate.push(c);
    }
  }

  if (collisions.length > 0) {
    console.warn(`\n⚠  ${collisions.length} colisão(ões) detectada(s) — requer resolução manual:`);
    for (const c of collisions) {
      console.warn(`  id=${String(c._id)}  name="${c.name}"  normalizedName="${c.normalizedName}"  municipalityCode=${c.municipalityCode ?? "(null)"}`);
    }
  }

  if (toUpdate.length > 0) {
    const ops = toUpdate.map((c) => ({
      updateOne: { filter: { _id: c._id }, update: { $set: { normalizedName: c.normalizedName } } },
    }));
    const result = await SchoolModel.bulkWrite(ops);
    console.log(`\n✓ ${result.modifiedCount} escola(s) atualizada(s) com normalizedName.`);
  }

  await mongoose.disconnect();
  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
