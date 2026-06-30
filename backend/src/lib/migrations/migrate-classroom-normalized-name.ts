import type { Collection, Document } from "mongodb";
import { normalizeClassroomName } from "../normalize-classroom-name";
import { ClassroomModel } from "../../modules/classes/classroom.model";
import { isMigrationApplied, recordMigrationApplied } from "./migration-ledger";
import { CLASSROOM_NORMALIZED_NAME_MIGRATION_V1 } from "./classroom-normalized-name.constants";

export type ClassroomNormalizedNameCollision = {
  schoolId: string;
  normalizedName: string;
  count: number;
  ids: string[];
};

export class ClassroomNormalizedNameCollisionError extends Error {
  readonly collisions: ClassroomNormalizedNameCollision[];

  constructor(collisions: ClassroomNormalizedNameCollision[]) {
    super(
      `Migracao de turmas bloqueada: ${collisions.length} colisao(oes) schoolId + normalizedName.`,
    );
    this.name = "ClassroomNormalizedNameCollisionError";
    this.collisions = collisions;
  }
}

export type MigrateClassroomNormalizedNameResult = {
  migrationId: string;
  skipped: boolean;
  updated: number;
  collisions: ClassroomNormalizedNameCollision[];
};

export type MigrateClassroomNormalizedNameOptions = {
  applyIndex?: boolean;
  force?: boolean;
};

export async function migrateClassroomNormalizedName(
  options?: MigrateClassroomNormalizedNameOptions,
): Promise<MigrateClassroomNormalizedNameResult> {
  const migrationId = CLASSROOM_NORMALIZED_NAME_MIGRATION_V1;
  const applyIndex = options?.applyIndex ?? true;
  const force = options?.force ?? false;

  if (!force && (await isMigrationApplied(migrationId))) {
    return { migrationId, skipped: true, updated: 0, collisions: [] };
  }

  const collection = ClassroomModel.collection;
  const cursor = collection.find({});
  let updated = 0;

  for await (const doc of cursor) {
    const name = typeof doc.name === "string" ? doc.name : "";
    const normalizedName = normalizeClassroomName(name);
    if (doc.normalizedName !== normalizedName) {
      await collection.updateOne({ _id: doc._id }, { $set: { normalizedName } });
      updated += 1;
    }
  }

  const collisions = await collection
    .aggregate<ClassroomNormalizedNameCollision>([
      {
        $group: {
          _id: { schoolId: "$schoolId", normalizedName: "$normalizedName" },
          count: { $sum: 1 },
          ids: { $push: { $toString: "$_id" } },
        },
      },
      { $match: { count: { $gt: 1 } } },
      {
        $project: {
          _id: 0,
          schoolId: { $toString: "$_id.schoolId" },
          normalizedName: "$_id.normalizedName",
          count: 1,
          ids: 1,
        },
      },
      { $sort: { schoolId: 1, normalizedName: 1 } },
    ])
    .toArray();

  if (collisions.length > 0) {
    throw new ClassroomNormalizedNameCollisionError(collisions);
  }

  if (applyIndex) {
    await applyClassroomNormalizedNameIndexes(collection);
  }

  await recordMigrationApplied(migrationId);

  return { migrationId, skipped: false, updated, collisions: [] };
}

async function applyClassroomNormalizedNameIndexes(collection: Collection<Document>): Promise<void> {
  try {
    await collection.dropIndex("schoolId_1_name_1");
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 27 && code !== 26) {
      throw err;
    }
  }

  await collection.createIndex({ schoolId: 1, normalizedName: 1 }, { unique: true });
}
