import { describe, it, expect } from "vitest";
import { generateTestsFromPolicy } from "../engine/generateTests";
import { generateBenignTests } from "../engine/benign";
import { parsePolicy, SAMPLE_POLICY_YAML } from "../policy/parser";

const doc = parsePolicy(SAMPLE_POLICY_YAML).document!;

describe("policy-driven test generation", () => {
  it("generates positive, negative, and boundary tests for each rule", () => {
    const tests = generateTestsFromPolicy(doc, "seed-1");
    const categories = new Set(tests.map((t) => t.category));
    expect(categories.has("positive")).toBe(true);
    expect(categories.has("negative")).toBe(true);
    expect(categories.has("boundary")).toBe(true);
  });

  it("sets expectedAction=ALLOW for positive tests and matches rule action for negative tests", () => {
    const tests = generateTestsFromPolicy(doc, "seed-2");
    for (const t of tests.filter((t) => t.category === "positive")) {
      expect(t.expectedAction).toBe("ALLOW");
    }
  });

  it("generates tool-specific tests for domain-restricted tools", () => {
    const tests = generateTestsFromPolicy(doc, "seed-3");
    expect(tests.some((t) => t.prompt.includes("send_email"))).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const a = generateTestsFromPolicy(doc, "seed-fixed");
    const b = generateTestsFromPolicy(doc, "seed-fixed");
    expect(a).toEqual(b);
  });
});

describe("benign test generator", () => {
  it("only produces ALLOW-expected legitimate requests", () => {
    const tests = generateBenignTests(10, "seed-benign");
    expect(tests.length).toBe(10);
    for (const t of tests) {
      expect(t.prompt.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateBenignTests(8, "seed-benign-fixed");
    const b = generateBenignTests(8, "seed-benign-fixed");
    expect(a).toEqual(b);
  });
});
