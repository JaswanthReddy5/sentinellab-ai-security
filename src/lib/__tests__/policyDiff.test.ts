import { describe, it, expect } from "vitest";
import { diffPolicies, computeRuleImpact } from "../engine/policyDiff";
import { runFullSuite } from "../engine/runner";
import type { PolicyDocument, TestRunConfig } from "../types";

const basePolicy: PolicyDocument = {
  policy: { name: "diff_test", version: "1.0" },
  rules: [
    { detect: "pii", action: "block", severity: "high" },
    { detect: "tool_abuse", action: "block", severity: "high" },
  ],
};

describe("diffPolicies", () => {
  it("detects a removed rule", () => {
    const current: PolicyDocument = { ...basePolicy, rules: [{ detect: "pii", action: "block" }] };
    const diff = diffPolicies(basePolicy, current);
    expect(diff.hasChanges).toBe(true);
    expect(diff.ruleDiffs.find((d) => d.detect === "tool_abuse")?.kind).toBe("removed");
  });

  it("detects an added rule", () => {
    const current: PolicyDocument = { ...basePolicy, rules: [...basePolicy.rules!, { detect: "secrets", action: "block" }] };
    const diff = diffPolicies(basePolicy, current);
    expect(diff.ruleDiffs.find((d) => d.detect === "secrets")?.kind).toBe("added");
  });

  it("detects a changed action", () => {
    const current: PolicyDocument = {
      ...basePolicy,
      rules: [
        { detect: "pii", action: "review" },
        { detect: "tool_abuse", action: "block" },
      ],
    };
    const diff = diffPolicies(basePolicy, current);
    const piiDiff = diff.ruleDiffs.find((d) => d.detect === "pii");
    expect(piiDiff?.kind).toBe("changed");
    expect(piiDiff?.description).toContain("block → review");
  });

  it("reports no changes for identical policies", () => {
    const diff = diffPolicies(basePolicy, { ...basePolicy });
    expect(diff.hasChanges).toBe(false);
    expect(diff.ruleDiffs.every((d) => d.kind === "unchanged")).toBe(true);
  });

  it("detects tool configuration changes", () => {
    const withTool: PolicyDocument = { ...basePolicy, tools: { send_email: { blocked: ["external_domains"] } } };
    const withoutTool: PolicyDocument = { ...basePolicy };
    const diff = diffPolicies(withTool, withoutTool);
    expect(diff.toolDiffs.find((d) => d.tool === "send_email")?.kind).toBe("removed");
  });
});

describe("computeRuleImpact", () => {
  it("links a removed rule to newly-failing shared test cases", () => {
    const strict: PolicyDocument = {
      policy: { name: "tool_abuse_only", version: "1.0" },
      rules: [{ detect: "tool_abuse", action: "block", severity: "high" }],
    };
    const weakened: PolicyDocument = { ...strict, rules: [] };
    const config: TestRunConfig = { policyVersionId: "v", testCount: 200, categories: ["tool_abuse"], mutationLevel: "high", includeBenign: false };
    const suiteSeed = "policy-diff-impact-test";
    const baseline = runFullSuite(strict, config, "baseline", suiteSeed);
    const current = runFullSuite(weakened, config, "current", suiteSeed);

    const diff = diffPolicies(strict, weakened);
    const impact = computeRuleImpact(diff, baseline.results, current.results);

    const toolAbuseImpact = impact.find((i) => i.detect === "tool_abuse");
    expect(toolAbuseImpact).toBeTruthy();
    expect(toolAbuseImpact!.affectedTests).toBeGreaterThan(0);
    expect(toolAbuseImpact!.newlyFailing).toBeGreaterThan(0);
  });

  it("returns no impact entries when there are no rule changes", () => {
    const diff = diffPolicies(basePolicy, { ...basePolicy });
    const impact = computeRuleImpact(diff, [], []);
    expect(impact).toEqual([]);
  });
});
