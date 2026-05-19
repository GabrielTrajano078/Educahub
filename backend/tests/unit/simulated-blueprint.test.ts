import { describe, expect, it } from "@jest/globals";
import { getSimulatedBlueprint } from "../../src/modules/exams/simulated-blueprint";

describe("getSimulatedBlueprint", () => {
  it("retorna blocos para LP 5º ano", () => {
    const blocks = getSimulatedBlueprint("LP", "5");

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.reduce((sum, b) => sum + b.count, 0)).toBe(14);
    expect(blocks.some((b) => b.axis === "LEITURA")).toBe(true);
  });

  it("retorna blocos para MAT 9º ano", () => {
    const blocks = getSimulatedBlueprint("MAT", "9");

    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.reduce((sum, b) => sum + b.count, 0)).toBe(18);
    expect(blocks.some((b) => b.axis === "ALGEBRA")).toBe(true);
  });
});
