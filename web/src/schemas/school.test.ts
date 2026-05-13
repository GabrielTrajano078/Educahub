import { describe, expect, it } from "vitest";
import { schoolSchema } from "./school";

describe("schoolSchema", () => {
  it("aceita escola minima", () => {
    expect(schoolSchema.parse({ _id: "507f1f77bcf86cd799439011", name: "EMEF Centro" })).toEqual({
      _id: "507f1f77bcf86cd799439011",
      name: "EMEF Centro",
    });
  });

  it("aceita campos opcionais e timestamps", () => {
    expect(
      schoolSchema.parse({
        _id: "507f1f77bcf86cd799439011",
        name: "EMEF Centro",
        city: "Fortaleza",
        municipalityCode: "2304400",
        createdAt: "2026-05-13T00:00:00.000Z",
        updatedAt: "2026-05-13T00:00:00.000Z",
      }),
    ).toEqual({
      _id: "507f1f77bcf86cd799439011",
      name: "EMEF Centro",
      city: "Fortaleza",
      municipalityCode: "2304400",
      createdAt: "2026-05-13T00:00:00.000Z",
      updatedAt: "2026-05-13T00:00:00.000Z",
    });
  });

  it("rejeita payload sem _id", () => {
    const r = schoolSchema.safeParse({ name: "EMEF Centro" });
    expect(r.success).toBe(false);
  });
});
