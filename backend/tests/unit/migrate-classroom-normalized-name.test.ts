import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/lib/migrations/migration-ledger", () => ({
  isMigrationApplied: jest.fn(),
  recordMigrationApplied: jest.fn(),
}));

jest.mock("../../src/modules/classes/classroom.model", () => ({
  ClassroomModel: {
    collection: {
      find: jest.fn(),
      updateOne: jest.fn(),
      aggregate: jest.fn(),
      dropIndex: jest.fn(),
      createIndex: jest.fn(),
    },
  },
}));

import { isMigrationApplied, recordMigrationApplied } from "../../src/lib/migrations/migration-ledger";
import { migrateClassroomNormalizedName } from "../../src/lib/migrations/migrate-classroom-normalized-name";
import { CLASSROOM_NORMALIZED_NAME_MIGRATION_V1 } from "../../src/lib/migrations/classroom-normalized-name.constants";
import { ClassroomModel } from "../../src/modules/classes/classroom.model";

const mockedIsApplied = jest.mocked(isMigrationApplied);
const mockedRecord = jest.mocked(recordMigrationApplied);

function mockEmptyClassrooms() {
  const toArray = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
  (ClassroomModel.collection.find as jest.Mock).mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      // vazio
    },
  });
  (ClassroomModel.collection.aggregate as jest.Mock).mockReturnValue({ toArray });
  jest.mocked(ClassroomModel.collection.dropIndex).mockRejectedValue({ code: 27 });
  jest.mocked(ClassroomModel.collection.createIndex).mockResolvedValue("schoolId_1_normalizedName_1");
}

describe("migrateClassroomNormalizedName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyClassrooms();
  });

  it("pula execução quando migração já está no ledger", async () => {
    mockedIsApplied.mockResolvedValue(true);

    const result = await migrateClassroomNormalizedName();

    expect(result).toEqual({
      migrationId: CLASSROOM_NORMALIZED_NAME_MIGRATION_V1,
      skipped: true,
      updated: 0,
      collisions: [],
    });
    expect(ClassroomModel.collection.find).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it("executa e registra no ledger na primeira aplicação", async () => {
    mockedIsApplied.mockResolvedValue(false);

    const result = await migrateClassroomNormalizedName();

    expect(result.skipped).toBe(false);
    expect(mockedRecord).toHaveBeenCalledWith(CLASSROOM_NORMALIZED_NAME_MIGRATION_V1);
  });
});
