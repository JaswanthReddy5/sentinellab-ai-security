import type {
  Policy,
  PolicyDocument,
  PolicyVersion,
  Recommendation,
  Regression,
  TestResult,
  TestRun,
  TestRunConfig,
} from "../types";
import { parsePolicy, serializePolicy } from "../policy/parser";
import { runFullSuite, categoryBreakdown } from "../engine/runner";
import { computeRegression } from "../engine/regression";
import { generateRecommendations } from "../engine/recommend";
import { shortId } from "../rng";

export interface SeedBundle {
  policies: Policy[];
  policyVersions: PolicyVersion[];
  runs: TestRun[];
  resultsByRun: Record<string, TestResult[]>;
  regressions: Regression[];
  recommendations: Recommendation[];
}

const POLICY_ID = "policy_prevent_customer_data_leak";
const DAY = 24 * 60 * 60 * 1000;

const V1_DOC: PolicyDocument = {
  policy: {
    name: "prevent_customer_data_leak",
    version: "1.0",
    description: "Baseline policy blocking PII, confidential data, credentials, injection, and unsafe tool use.",
  },
  rules: [
    { detect: "pii", action: "block", severity: "high" },
    { detect: "confidential_data", action: "block", severity: "high" },
    { detect: "credentials", action: "block", severity: "critical" },
    { detect: "secrets", action: "block", severity: "critical" },
    { detect: "prompt_injection", action: "block", severity: "high" },
    { detect: "jailbreak", action: "block", severity: "high" },
    { detect: "tool_abuse", action: "block", severity: "high" },
    { detect: "data_exfiltration", action: "block", severity: "critical" },
    { detect: "privilege_escalation", action: "block", severity: "critical" },
    { detect: "excessive_agency", action: "review", severity: "medium" },
    { detect: "malicious_document", action: "block", severity: "high" },
    { detect: "policy_evasion", action: "review", severity: "medium" },
  ],
  tools: {
    send_email: { allowed: ["internal_domains"], blocked: ["external_domains"] },
  },
};

// v2 simulates a real-world accidental regression: a well-intentioned
// refactor relaxed tool-abuse enforcement and dropped explicit coverage for
// malicious-document and excessive-agency scenarios.
const V2_DOC: PolicyDocument = {
  policy: {
    name: "prevent_customer_data_leak",
    version: "2.4",
    description: "Refactored policy — tightened PII/credential rules, but tool-abuse enforcement was inadvertently relaxed.",
  },
  rules: [
    { detect: "pii", action: "block", severity: "high" },
    { detect: "confidential_data", action: "block", severity: "high" },
    { detect: "credentials", action: "block", severity: "critical" },
    { detect: "secrets", action: "block", severity: "critical" },
    { detect: "prompt_injection", action: "block", severity: "high" },
    { detect: "jailbreak", action: "block", severity: "high" },
    { detect: "tool_abuse", action: "review", severity: "medium" },
    { detect: "data_exfiltration", action: "block", severity: "critical" },
    { detect: "privilege_escalation", action: "block", severity: "critical" },
    { detect: "policy_evasion", action: "review", severity: "medium" },
  ],
  tools: {
    send_email: { allowed: ["internal_domains"], blocked: ["external_domains"] },
  },
};

const RUN_CONFIG: TestRunConfig = {
  policyVersionId: "",
  testCount: 1000,
  categories: [],
  mutationLevel: "high",
  includeBenign: true,
};

function buildRun(
  doc: PolicyDocument,
  policyVersionId: string,
  versionLabel: string,
  runLabel: string,
  createdAt: string
): { run: TestRun; results: TestResult[] } {
  const runId = shortId("run", `${POLICY_ID}:${versionLabel}:${runLabel}`);
  const config: TestRunConfig = { ...RUN_CONFIG, policyVersionId };
  const outcome = runFullSuite(doc, config, runId, POLICY_ID);

  const run: TestRun = {
    id: runId,
    label: runLabel,
    policyId: POLICY_ID,
    policyName: doc.policy.name,
    policyVersionId,
    policyVersionLabel: versionLabel,
    config,
    stats: outcome.stats,
    status: "completed",
    createdAt,
    completedAt: createdAt,
  };

  return { run, results: outcome.results };
}

let cached: SeedBundle | null = null;

/** Deterministically builds the full demo dataset. Safe to call repeatedly — always produces the same output. */
export function buildSeedBundle(): SeedBundle {
  if (cached) return cached;

  const now = Date.now();
  const v1CreatedAt = new Date(now - 21 * DAY).toISOString();
  const v2CreatedAt = new Date(now - 2 * DAY).toISOString();

  const v1Raw = serializePolicy(V1_DOC, "yaml");
  const v2Raw = serializePolicy(V2_DOC, "yaml");
  const v1Parsed = parsePolicy(v1Raw);
  const v2Parsed = parsePolicy(v2Raw);
  if (!v1Parsed.ok || !v2Parsed.ok) throw new Error("Seed policy documents failed to parse — this indicates a bug in seedData.ts");

  const v1Id = shortId("pv", `${POLICY_ID}:v1`);
  const v2Id = shortId("pv", `${POLICY_ID}:v2`);

  const policyVersions: PolicyVersion[] = [
    { id: v1Id, policyId: POLICY_ID, label: "v1.0", document: V1_DOC, raw: v1Raw, format: "yaml", createdAt: v1CreatedAt, isActive: false },
    { id: v2Id, policyId: POLICY_ID, label: "v2.4", document: V2_DOC, raw: v2Raw, format: "yaml", createdAt: v2CreatedAt, isActive: true },
  ];

  const policies: Policy[] = [
    {
      id: POLICY_ID,
      name: "prevent_customer_data_leak",
      slug: "prevent-customer-data-leak",
      description: "Prevents leakage of customer PII, confidential data, credentials, and blocks unsafe tool use.",
      status: "active",
      createdAt: v1CreatedAt,
      updatedAt: v2CreatedAt,
      versions: policyVersions,
    },
  ];

  const { run: run1, results: results1 } = buildRun(V1_DOC, v1Id, "v1.0", "Baseline regression sweep", v1CreatedAt);
  const { run: run2, results: results2 } = buildRun(V2_DOC, v2Id, "v2.4", "Post-refactor regression sweep", v2CreatedAt);

  // A third, older run further back to give the coverage trend chart more history.
  const v0CreatedAt = new Date(now - 45 * DAY).toISOString();
  const { run: run0, results: results0 } = (() => {
    const doc: PolicyDocument = {
      ...V1_DOC,
      policy: { ...V1_DOC.policy, version: "0.9" },
      rules: V1_DOC.rules?.filter((r) => r.detect !== "malicious_document"),
    };
    return buildRun(doc, shortId("pv", `${POLICY_ID}:v0`), "v0.9", "Initial rollout sweep", v0CreatedAt);
  })();

  const runs = [run0, run1, run2].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const resultsByRun: Record<string, TestResult[]> = {
    [run0.id]: results0,
    [run1.id]: results1,
    [run2.id]: results2,
  };

  const regression = computeRegression({
    baselineRun: run1,
    baselineResults: results1,
    currentRun: run2,
    currentResults: results2,
  });

  const earlyRegression = computeRegression({
    baselineRun: run0,
    baselineResults: results0,
    currentRun: run1,
    currentResults: results1,
  });

  const recommendations = generateRecommendations(run2.id, run2.policyName, results2);

  cached = {
    policies,
    policyVersions,
    runs,
    resultsByRun,
    regressions: [earlyRegression, regression],
    recommendations,
  };
  return cached;
}

export function categoryBreakdownFor(runId: string, resultsByRun: Record<string, TestResult[]>) {
  const results = resultsByRun[runId] ?? [];
  return categoryBreakdown(results);
}
