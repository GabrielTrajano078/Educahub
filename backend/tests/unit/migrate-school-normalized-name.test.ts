import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/lib/migrations/migration-ledger", () => ({
  isMigrationApplied: jest.fn(),
  recordMigrationApplied: jest.fn(),
}));

jest.mock("../../src/modules/schools/school.model", () => ({
  SchoolModel: {
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
import { migrateSchoolNormalizedName } from "../../src/lib/migrations/migrate-school-normalized-name";
import { SCHOOL_NORMALIZED_NAME_MIGRATION_V1 } from "../../src/lib/migrations/school-normalized-name.constants";
import { SchoolModel } from "../../src/modules/schools/school.model";

const mockedIsApplied = jest.mocked(isMigrationApplied);
const mockedRecord = jest.mocked(recordMigrationApplied);

function mockEmptySchools() {
  const toArray = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
  (SchoolModel.collection.find as jest.Mock).mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      // vazio
    },
  });
  (SchoolModel.collection.aggregate as jest.Mock).mockReturnValue({ toArray });
  jest.mocked(SchoolModel.collection.dropIndex).mockRejectedValue({ code: 27 });
  jest.mocked(SchoolModel.collection.createIndex).mockResolvedValue("municipalityCode_1_normalizedName_1");
}

describe("migrateSchoolNormalizedName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptySchools();
  });

  it("pula execução quando migração já está no ledger", async () => {
    mockedIsApplied.mockResolvedValue(true);

    const result = await migrateSchoolNormalizedName();

    expect(result).toEqual({
      migrationId: SCHOOL_NORMALIZED_NAME_MIGRATION_V1,
      skipped: true,
      updated: 0,
      collisions: [],
    });
    expect(SchoolModel.collection.find).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it("executa e registra no ledger na primeira aplicação", async () => {
    mockedIsApplied.mockResolvedValue(false);

    const result = await migrateSchoolNormalizedName();

    expect(result.skipped).toBe(false);
    expect(mockedRecord).toHaveBeenCalledWith(SCHOOL_NORMALIZED_NAME_MIGRATION_V1);
  });

  it("force ignora ledger e reexecuta", async () => {
    mockedIsApplied.mockResolvedValue(true);

    const result = await migrateSchoolNormalizedName({ force: true });

    expect(result.skipped).toBe(false);
    expect(SchoolModel.collection.find).toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(SCHOOL_NORMALIZED_NAME_MIGRATION_V1);
  });
});
