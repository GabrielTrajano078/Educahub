import type { Collection, Document } from "mongodb";
import { normalizeSchoolName } from "../normalize-school-name";
import { SchoolModel } from "../../modules/schools/school.model";
import { isMigrationApplied, recordMigrationApplied } from "./migration-ledger";
import { SCHOOL_NORMALIZED_NAME_MIGRATION_V1 } from "./school-normalized-name.constants";

export type SchoolNormalizedNameCollision = {
  municipalityCode: string;
  normalizedName: string;
  count: number;
  ids: string[];
};

export class SchoolNormalizedNameCollisionError extends Error {
  readonly collisions: SchoolNormalizedNameCollision[];

  constructor(collisions: SchoolNormalizedNameCollision[]) {
    super(
      `Migracao de escolas bloqueada: ${collisions.length} colisao(oes) municipalityCode + normalizedName.`,
    );
    this.name = "SchoolNormalizedNameCollisionError";
    this.collisions = collisions;
  }
}

export type MigrateSchoolNormalizedNameResult = {
  migrationId: string;
  /** true quando o ledger indica que a migração v1 já foi aplicada (sem scan). */
  skipped: boolean;
  updated: number;
  collisions: SchoolNormalizedNameCollision[];
};

export type MigrateSchoolNormalizedNameOptions = {
  applyIndex?: boolean;
  /** Ignora o ledger e reexecuta backfill/índices (uso manual/dev). */
  force?: boolean;
};

/**
 * Backfill de normalizedName, verificação de colisões e índices.
 * Executa no máximo uma vez por ambiente (registro em app_migrations), salvo `force`.
 */
export async function migrateSchoolNormalizedName(
  options?: MigrateSchoolNormalizedNameOptions,
): Promise<MigrateSchoolNormalizedNameResult> {
  const migrationId = SCHOOL_NORMALIZED_NAME_MIGRATION_V1;
  const applyIndex = options?.applyIndex ?? true;
  const force = options?.force ?? false;

  if (!force && (await isMigrationApplied(migrationId))) {
    return { migrationId, skipped: true, updated: 0, collisions: [] };
  }

  const collection = SchoolModel.collection;
  const cursor = collection.find({});
  let updated = 0;

  for await (const doc of cursor) {
    const name = typeof doc.name === "string" ? doc.name : "";
    const normalizedName = normalizeSchoolName(name);
    if (doc.normalizedName !== normalizedName) {
      await collection.updateOne({ _id: doc._id }, { $set: { normalizedName } });
      updated += 1;
    }
  }

  const collisions = await collection
    .aggregate<SchoolNormalizedNameCollision>([
      { $match: { municipalityCode: { $exists: true, $type: "string" } } },
      {
        $group: {
          _id: { municipalityCode: "$municipalityCode", normalizedName: "$normalizedName" },
          count: { $sum: 1 },
          ids: { $push: { $toString: "$_id" } },
        },
      },
      { $match: { count: { $gt: 1 } } },
      {
        $project: {
          _id: 0,
          municipalityCode: "$_id.municipalityCode",
          normalizedName: "$_id.normalizedName",
          count: 1,
          ids: 1,
        },
      },
      { $sort: { municipalityCode: 1, normalizedName: 1 } },
    ])
    .toArray();

  if (collisions.length > 0) {
    throw new SchoolNormalizedNameCollisionError(collisions);
  }

  if (applyIndex) {
    await applySchoolNormalizedNameIndexes(collection);
  }

  await recordMigrationApplied(migrationId);

  return { migrationId, skipped: false, updated, collisions: [] };
}

async function applySchoolNormalizedNameIndexes(collection: Collection<Document>): Promise<void> {
  try {
    await collection.dropIndex("municipalityCode_1_name_1");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 27 && code !== 26) {
      throw err;
    }
  }

  await collection.createIndex(
    { municipalityCode: 1, normalizedName: 1 },
    {
      unique: true,
      partialFilterExpression: { municipalityCode: { $exists: true, $type: "string" } },
    },
  );
}
