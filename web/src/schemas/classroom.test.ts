import { describe, expect, it } from "vitest";
import { classroomDisplayName, classroomOptionLabel, classroomSchema } from "./classroom";

describe("classroomSchema", () => {
  it("aceita turma minima com normalizedName", () => {
    expect(
      classroomSchema.parse({
        _id: "507f1f77bcf86cd799439011",
        schoolId: "507f1f77bcf86cd799439012",
        name: "5A Manha",
        normalizedName: "5A MANHA",
        grade: "5",
      }),
    ).toEqual({
      _id: "507f1f77bcf86cd799439011",
      schoolId: "507f1f77bcf86cd799439012",
      name: "5A Manha",
      normalizedName: "5A MANHA",
      grade: "5",
    });
  });

  it("rejeita payload sem normalizedName", () => {
    const r = classroomSchema.safeParse({
      _id: "507f1f77bcf86cd799439011",
      schoolId: "507f1f77bcf86cd799439012",
      name: "5A Manha",
      grade: "5",
    });
    expect(r.success).toBe(false);
  });
});

describe("classroomDisplayName", () => {
  it("retorna normalizedName para exibição", () => {
    expect(classroomDisplayName({ normalizedName: "5A MANHA" })).toBe("5A MANHA");
  });
});

describe("classroomOptionLabel", () => {
  it("monta label com ano", () => {
    expect(classroomOptionLabel({ normalizedName: "5A MANHA", grade: "5" })).toBe("5A MANHA (5º)");
  });
});
