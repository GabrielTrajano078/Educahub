import { describe, expect, it } from "@jest/globals";
import { normalizeClassroomName } from "../../src/lib/normalize-classroom-name";

describe("normalizeClassroomName", () => {
  it("normaliza nome com acentos e espaços extras", () => {
    expect(normalizeClassroomName("5A Manhã")).toBe("5A MANHA");
    expect(normalizeClassroomName("  5A   Manha  ")).toBe("5A MANHA");
  });
});
