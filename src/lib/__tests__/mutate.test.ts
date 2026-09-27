import { describe, it, expect } from "vitest";
import { MUTATIONS, mutateSeed, mutationsForLevel } from "../engine/mutate";
import { ATTACK_SEEDS } from "../engine/seeds";

describe("attack mutation engine", () => {
  it("has 12 mutation techniques", () => {
    expect(MUTATIONS.length).toBe(12);
  });

  it("produces a non-empty test prompt distinct from the original seed for every mutation", () => {
    const seed = ATTACK_SEEDS[0];
    for (const mutation of MUTATIONS) {
      const mutated = mutateSeed(seed, mutation);
      expect(mutated.testPrompt.length).toBeGreaterThan(0);
      expect(mutated.testPrompt).not.toBe(seed.text);
      expect(mutated.mutationType).toBe(mutation.type);
      expect(mutated.category).toBe(seed.category);
    }
  });

  it("is deterministic — the same seed+mutation always produces the same output and id", () => {
    const seed = ATTACK_SEEDS[0];
    const mutation = MUTATIONS[0];
    const a = mutateSeed(seed, mutation);
    const b = mutateSeed(seed, mutation);
    expect(a.testPrompt).toBe(b.testPrompt);
    expect(a.attackId).toBe(b.attackId);
  });

  it("scales mutation count with level", () => {
    expect(mutationsForLevel("low").length).toBeLessThan(mutationsForLevel("high").length);
  });

  it("never generates content containing a real credential-looking secret value", () => {
    for (const seed of ATTACK_SEEDS) {
      expect(seed.text).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
      expect(seed.text).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
    }
  });
});
