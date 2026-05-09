import { Types } from "mongoose";
import { ClassroomModel } from "../../src/modules/classes/classroom.model";
import { classroomIdsForGrade, isDuplicateKeyError } from "../../src/modules/students/students.server-logic";

jest.mock("../../src/modules/classes/classroom.model", () => ({
  ClassroomModel: {
    find: jest.fn(),
  },
}));

const adminUser = {
  id: "507f191e810c19729de860ea",
  role: "admin" as const,
  schoolId: null as string | null,
  municipalityCode: null as string | null,
  classroomIds: [] as string[],
};

const professorUser = {
  id: "507f191e810c19729de860eb",
  role: "professor" as const,
  schoolId: "507f1f77bcf86cd799439011",
  municipalityCode: null as string | null,
  classroomIds: ["507f1f77bcf86cd799439012"],
};

describe("isDuplicateKeyError", () => {
  it.each([
    ["null", null, false],
    ["undefined", undefined, false],
    ["objeto vazio", {}, false],
    ["code diferente de 11000", { code: 11001 }, false],
    ["code 11000", { code: 11000 }, true],
  ])("%s", (_label, input, expected) => {
    expect(isDuplicateKeyError(input)).toBe(expected);
  });
});

describe("classroomIdsForGrade", () => {
  beforeEach(() => {
    (ClassroomModel.find as jest.Mock).mockReset();
  });

  it("admin com schoolId no filtro consulta grade e schoolId", async () => {
    const oid = new Types.ObjectId();
    (ClassroomModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: oid }]),
      }),
    });

    const ids = await classroomIdsForGrade("5", "507f1f77bcf86cd799439011", adminUser);

    expect(ClassroomModel.find).toHaveBeenCalledWith({
      grade: "5",
      schoolId: "507f1f77bcf86cd799439011",
    });
    expect(ids).toEqual([oid]);
  });

  it("professor sem schoolId valido retorna vazio sem consultar turmas", async () => {
    const user = { ...professorUser, schoolId: "invalid" };
    const ids = await classroomIdsForGrade("9", undefined, user);
    expect(ids).toEqual([]);
    expect(ClassroomModel.find).not.toHaveBeenCalled();
  });

  it("professor com schoolId consulta grade e escola do usuario", async () => {
    const oid = new Types.ObjectId();
    (ClassroomModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: oid }]),
      }),
    });

    const ids = await classroomIdsForGrade("9", undefined, professorUser);

    expect(ClassroomModel.find).toHaveBeenCalledWith({
      grade: "9",
      schoolId: professorUser.schoolId,
    });
    expect(ids).toEqual([oid]);
  });
});
