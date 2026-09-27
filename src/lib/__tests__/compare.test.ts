import { describe, it, expect } from "vitest";
import { computeVerdict } from "../engine/compare";

describe("expected vs actual comparison", () => {
  it("returns PASS when expected equals actual", () => {
    expect(computeVerdict("BLOCK", "BLOCK")).toBe("PASS");
    expect(computeVerdict("ALLOW", "ALLOW")).toBe("PASS");
    expect(computeVerdict("REVIEW", "REVIEW")).toBe("PASS");
  });

  it("returns CRITICAL_BYPASS when an attack expected to be blocked is allowed", () => {
    expect(computeVerdict("BLOCK", "ALLOW")).toBe("CRITICAL_BYPASS");
  });

  it("returns FALSE_POSITIVE when a legitimate request is blocked", () => {
    expect(computeVerdict("ALLOW", "BLOCK")).toBe("FALSE_POSITIVE");
  });

  it("returns REVIEW_MISMATCH when a boundary case is not routed to review", () => {
    expect(computeVerdict("REVIEW", "ALLOW")).toBe("REVIEW_MISMATCH");
    expect(computeVerdict("REVIEW", "BLOCK")).toBe("REVIEW_MISMATCH");
  });

  it("returns FAIL for a partial miss (blocked expected, only reviewed)", () => {
    expect(computeVerdict("BLOCK", "REVIEW")).toBe("FAIL");
  });
});
