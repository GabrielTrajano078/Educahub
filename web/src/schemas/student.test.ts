import { describe, expect, it } from "vitest";
import { studentDisplayName, studentSchema } from "./student";

describe("studentSchema", () => {
  it("aceita aluno minimo com normalizedFullName", () => {
    expect(
      studentSchema.parse({
        _id: "507f1f77bcf86cd799439011",
        schoolId: "507f1f77bcf86cd799439012",
        classroomId: "507f1f77bcf86cd799439013",
        fullName: "Ana Clara Sousa",
        normalizedFullName: "ANA CLARA SOUSA",
        registrationCode: "ALU-0001",
      }),
    ).toEqual({
      _id: "507f1f77bcf86cd799439011",
      schoolId: "507f1f77bcf86cd799439012",
      classroomId: "507f1f77bcf86cd799439013",
      fullName: "Ana Clara Sousa",
      normalizedFullName: "ANA CLARA SOUSA",
      registrationCode: "ALU-0001",
    });
  });

  it("rejeita payload sem normalizedFullName", () => {
    const r = studentSchema.safeParse({
      _id: "507f1f77bcf86cd799439011",
      schoolId: "507f1f77bcf86cd799439012",
      classroomId: "507f1f77bcf86cd799439013",
      fullName: "Ana Clara Sousa",
      registrationCode: "ALU-0001",
    });
    expect(r.success).toBe(false);
  });
});

describe("studentDisplayName", () => {
  it("retorna normalizedFullName para exibição", () => {
    expect(studentDisplayName({ normalizedFullName: "ANA CLARA SOUSA" })).toBe("ANA CLARA SOUSA");
  });
});
