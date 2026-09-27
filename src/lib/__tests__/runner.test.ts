import { describe, it, expect } from "vitest";
import { parsePolicy, SAMPLE_POLICY_YAML } from "../policy/parser";
import { runFullSuite, computeStats } from "../engine/runner";
import { computeRegression } from "../engine/regression";
import type { TestRunConfig } from "../types";

const doc = parsePolicy(SAMPLE_POLICY_YAML).document!;
const baseConfig: TestRunConfig = { policyVersionId: "v1", testCount: 120, categories: [], mutationLevel: "medium", includeBenign: true };

describe("test runner", () => {
  it("generates the requested composition of test cases", () => {
    const outcome = runFullSuite(doc, baseConfig, "run-1");
    expect(outcome.testCases.length).toBeGreaterThan(0);
    const sources = new Set(outcome.testCases.map((t) => t.source));
    expect(sources.has("policy_generated")).toBe(true);
    expect(sources.has("attack_mutation")).toBe(true);
    expect(sources.has("benign")).toBe(true);
  });

  it("is fully deterministic for the same runId", () => {
    const a = runFullSuite(doc, baseConfig, "run-fixed");
    const b = runFullSuite(doc, baseConfig, "run-fixed");
    expect(a.stats).toEqual(b.stats);
    expect(a.testCases.map((t) => t.id)).toEqual(b.testCases.map((t) => t.id));
  });

  it("computes false positive rate only over ALLOW-expected cases", () => {
    const outcome = runFullSuite(doc, baseConfig, "run-fp");
    const allowExpected = outcome.results.filter((r) => r.testCase.expectedAction === "ALLOW");
    const falsePositives = allowExpected.filter((r) => r.verdict === "FALSE_POSITIVE");
    const expectedRate = allowExpected.length > 0 ? Number(((falsePositives.length / allowExpected.length) * 100).toFixed(1)) : 0;
    expect(outcome.stats.falsePositiveRate).toBe(expectedRate);
  });

  it("computes security coverage only over BLOCK-expected cases", () => {
    const outcome = runFullSuite(doc, baseConfig, "run-cov");
    const blockExpected = outcome.results.filter((r) => r.testCase.expectedAction === "BLOCK");
    const blocked = blockExpected.filter((r) => r.actualAction === "BLOCK");
    const expectedCoverage = blockExpected.length > 0 ? Number(((blocked.length / blockExpected.length) * 100).toFixed(1)) : 100;
    expect(outcome.stats.securityCoverage).toBe(expectedCoverage);
  });

  it("recomputes identical stats from computeStats(results) directly", () => {
    const outcome = runFullSuite(doc, baseConfig, "run-recompute");
    expect(computeStats(outcome.results)).toEqual(outcome.stats);
  });
});

describe("regression engine", () => {
  it("detects new bypasses when a category is weakened between two policy versions", () => {
    // Purpose-built minimal policy with a single tool_abuse rule and no
    // overlapping detectors, so removing it has an unambiguous effect —
    // isolates the regression-detection logic from detector overlap.
    const strictDoc = {
      policy: { name: "tool_abuse_only", version: "1.0" },
      rules: [{ detect: "tool_abuse" as const, action: "block" as const, severity: "high" as const }],
    };
    const weakenedDoc = { ...strictDoc, rules: [] as typeof strictDoc.rules };

    const config: TestRunConfig = {
      policyVersionId: "v",
      testCount: 200,
      categories: ["tool_abuse"],
      mutationLevel: "high",
      includeBenign: false,
    };
    const suiteSeed = "regression-test-policy";
    const baseline = runFullSuite(strictDoc, config, "baseline-run", suiteSeed);
    const current = runFullSuite(weakenedDoc, config, "current-run", suiteSeed);

    const regression = computeRegression({
      baselineRun: {
        id: "baseline-run",
        label: "baseline",
        policyId: "p",
        policyName: "test",
        policyVersionId: "v1",
        policyVersionLabel: "v1",
        config,
        stats: baseline.stats,
        status: "completed",
        createdAt: new Date(0).toISOString(),
        completedAt: new Date(0).toISOString(),
      },
      baselineResults: baseline.results,
      currentRun: {
        id: "current-run",
        label: "current",
        policyId: "p",
        policyName: "test",
        policyVersionId: "v2",
        policyVersionLabel: "v2",
        config,
        stats: current.stats,
        status: "completed",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      currentResults: current.results,
    });

    expect(regression.currentCoverage).toBeLessThanOrEqual(regression.previousCoverage);
    expect(regression.isRegression).toBe(true);
    expect(regression.newBypassCount).toBeGreaterThan(0);
  });
});
