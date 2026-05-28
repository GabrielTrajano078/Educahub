import type { Collection, Document } from "mongodb";
import { normalizeStudentFullName } from "../normalize-student-full-name";
import { StudentModel } from "../../modules/students/student.model";
import { isMigrationApplied, recordMigrationApplied } from "./migration-ledger";
import { STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1 } from "./student-normalized-full-name.constants";

export type StudentNormalizedFullNameCollision = {
  classroomId: string;
  normalizedFullName: string;
  count: number;
  ids: string[];
};

export class StudentNormalizedFullNameCollisionError extends Error {
  readonly collisions: StudentNormalizedFullNameCollision[];

  constructor(collisions: StudentNormalizedFullNameCollision[]) {
    super(
      `Migracao de alunos bloqueada: ${collisions.length} colisao(oes) classroomId + normalizedFullName.`,
    );
    this.name = "StudentNormalizedFullNameCollisionError";
    this.collisions = collisions;
  }
}

export type MigrateStudentNormalizedFullNameResult = {
  migrationId: string;
  skipped: boolean;
  updated: number;
  collisions: StudentNormalizedFullNameCollision[];
};

export type MigrateStudentNormalizedFullNameOptions = {
  applyIndex?: boolean;
  force?: boolean;
};

/**
 * Backfill de normalizedFullName, verificação de colisões e índices.
 * Executa no máximo uma vez por ambiente (registro em app_migrations), salvo `force`.
 */
export async function migrateStudentNormalizedFullName(
  options?: MigrateStudentNormalizedFullNameOptions,
): Promise<MigrateStudentNormalizedFullNameResult> {
  const migrationId = STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1;
  const applyIndex = options?.applyIndex ?? true;
  const force = options?.force ?? false;

  if (!force && (await isMigrationApplied(migrationId))) {
    return { migrationId, skipped: true, updated: 0, collisions: [] };
  }

  const collection = StudentModel.collection;
  const cursor = collection.find({});
  let updated = 0;

  for await (const doc of cursor) {
    const fullName = typeof doc.fullName === "string" ? doc.fullName : "";
    const normalizedFullName = normalizeStudentFullName(fullName);
    if (doc.normalizedFullName !== normalizedFullName) {
      await collection.updateOne({ _id: doc._id }, { $set: { normalizedFullName } });
      updated += 1;
    }
  }

  const collisions = await collection
    .aggregate<StudentNormalizedFullNameCollision>([
      {
        $group: {
          _id: { classroomId: "$classroomId", normalizedFullName: "$normalizedFullName" },
          count: { $sum: 1 },
          ids: { $push: { $toString: "$_id" } },
        },
      },
      { $match: { count: { $gt: 1 } } },
      {
        $project: {
          _id: 0,
          classroomId: { $toString: "$_id.classroomId" },
          normalizedFullName: "$_id.normalizedFullName",
          count: 1,
          ids: 1,
        },
      },
      { $sort: { classroomId: 1, normalizedFullName: 1 } },
    ])
    .toArray();

  if (collisions.length > 0) {
    throw new StudentNormalizedFullNameCollisionError(collisions);
  }

  if (applyIndex) {
    await applyStudentNormalizedFullNameIndexes(collection);
  }

  await recordMigrationApplied(migrationId);

  return { migrationId, skipped: false, updated, collisions: [] };
}

async function applyStudentNormalizedFullNameIndexes(collection: Collection<Document>): Promise<void> {
  await collection.createIndex({ classroomId: 1, normalizedFullName: 1 }, { unique: true });
}
