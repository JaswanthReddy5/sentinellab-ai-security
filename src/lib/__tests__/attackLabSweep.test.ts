import { describe, it, expect } from "vitest";
import { runAttackLabSweep } from "../engine/runner";
import { parsePolicy, SAMPLE_POLICY_YAML } from "../policy/parser";
import { ATTACK_SEEDS } from "../engine/seeds";
import { MUTATIONS } from "../engine/mutate";

const doc = parsePolicy(SAMPLE_POLICY_YAML).document!;

describe("runAttackLabSweep", () => {
  it("generates every seed x mutation combination for a single category", () => {
    const category = "tool_abuse" as const;
    const seedsInCategory = ATTACK_SEEDS.filter((s) => s.category === category).length;
    const result = runAttackLabSweep(doc, category, "high");
    expect(result.stats.generated).toBe(seedsInCategory * MUTATIONS.length);
    expect(result.variants.every((v) => v.category === category)).toBe(true);
  });

  it("generates variants across all categories when none is specified", () => {
    const result = runAttackLabSweep(doc, null, "low");
    expect(result.stats.generated).toBeGreaterThan(0);
    const categories = new Set(result.variants.map((v) => v.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it("stats add up to the total generated count", () => {
    const result = runAttackLabSweep(doc, null, "medium");
    expect(result.stats.blocked + result.stats.review + result.stats.bypassed).toBe(result.stats.generated);
  });

  it("is deterministic", () => {
    const a = runAttackLabSweep(doc, "credential_exposure", "high");
    const b = runAttackLabSweep(doc, "credential_exposure", "high");
    expect(a).toEqual(b);
  });

  it("every variant carries full evaluation detail", () => {
    const result = runAttackLabSweep(doc, "pii_leakage", "low");
    for (const v of result.variants) {
      expect(v.expectedAction).toBe("BLOCK");
      expect(["ALLOW", "BLOCK", "REVIEW"]).toContain(v.actualAction);
      expect(v.attackId.length).toBeGreaterThan(0);
    }
  });
});
