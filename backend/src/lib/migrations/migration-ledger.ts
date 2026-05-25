import { AppMigrationModel } from "./migration-ledger.model";

export async function isMigrationApplied(name: string): Promise<boolean> {
  const found = await AppMigrationModel.exists({ name }).lean();
  return found !== null;
}

export async function recordMigrationApplied(name: string): Promise<void> {
  await AppMigrationModel.updateOne(
    { name },
    { $setOnInsert: { name, appliedAt: new Date() } },
    { upsert: true },
  );
}
