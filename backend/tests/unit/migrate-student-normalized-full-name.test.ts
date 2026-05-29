import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/lib/migrations/migration-ledger", () => ({
  isMigrationApplied: jest.fn(),
  recordMigrationApplied: jest.fn(),
}));

jest.mock("../../src/modules/students/student.model", () => ({
  StudentModel: {
    collection: {
      find: jest.fn(),
      updateOne: jest.fn(),
      aggregate: jest.fn(),
      createIndex: jest.fn(),
    },
  },
}));

import { isMigrationApplied, recordMigrationApplied } from "../../src/lib/migrations/migration-ledger";
import { migrateStudentNormalizedFullName } from "../../src/lib/migrations/migrate-student-normalized-full-name";
import { STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1 } from "../../src/lib/migrations/student-normalized-full-name.constants";
import { StudentModel } from "../../src/modules/students/student.model";

const mockedIsApplied = jest.mocked(isMigrationApplied);
const mockedRecord = jest.mocked(recordMigrationApplied);

function mockEmptyStudents() {
  const toArray = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
  (StudentModel.collection.find as jest.Mock).mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      // vazio
    },
  });
  (StudentModel.collection.aggregate as jest.Mock).mockReturnValue({ toArray });
  jest.mocked(StudentModel.collection.createIndex).mockResolvedValue("classroomId_1_normalizedFullName_1");
}

describe("migrateStudentNormalizedFullName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyStudents();
  });

  it("pula execução quando migração já está no ledger", async () => {
    mockedIsApplied.mockResolvedValue(true);

    const result = await migrateStudentNormalizedFullName();

    expect(result).toEqual({
      migrationId: STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1,
      skipped: true,
      updated: 0,
      collisions: [],
    });
    expect(StudentModel.collection.find).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it("executa e registra no ledger na primeira aplicação", async () => {
    mockedIsApplied.mockResolvedValue(false);

    const result = await migrateStudentNormalizedFullName();

    expect(result.skipped).toBe(false);
    expect(mockedRecord).toHaveBeenCalledWith(STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1);
  });

  it("force ignora ledger e reexecuta", async () => {
    mockedIsApplied.mockResolvedValue(true);

    const result = await migrateStudentNormalizedFullName({ force: true });

    expect(result.skipped).toBe(false);
    expect(StudentModel.collection.find).toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(STUDENT_NORMALIZED_FULL_NAME_MIGRATION_V1);
  });
});
