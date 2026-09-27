import type {
  AttackCategoryKey,
  PolicyDocument,
  SecurityTestCase,
  TestResult,
  TestRunConfig,
  TestRunStats,
} from "../types";
import { generateTestsFromPolicy } from "./generateTests";
import { seedsForCategories } from "./seeds";
import { mutationsForLevel, mutateSeed } from "./mutate";
import { generateBenignTests } from "./benign";
import { evaluatePolicy } from "./evaluate";
import { computeVerdict } from "./compare";
import { createRng, pickN, shortId } from "../rng";

export interface RunOutcome {
  testCases: SecurityTestCase[];
  results: TestResult[];
  stats: TestRunStats;
}

/**
 * Builds the deterministic test-case suite for a run.
 *
 * `suiteSeed` should be stable across policy VERSIONS of the same policy
 * (e.g. the policyId) so that regression comparisons evaluate the identical
 * prompt set against different policy versions — otherwise "previously
 * blocked, now allowed" comparisons would be meaningless. `runId` is only
 * used to namespace the resulting record's `runId` field.
 */
export function buildTestSuite(
  doc: PolicyDocument,
  config: TestRunConfig,
  runId: string,
  suiteSeed: string = runId
): SecurityTestCase[] {
  const cases: SecurityTestCase[] = [];
  const rng = createRng(`${suiteSeed}:suite:${config.testCount}:${config.mutationLevel}:${config.categories.join(",")}`);

  // 1. Policy-generated positive / negative / boundary tests.
  const policyTests = generateTestsFromPolicy(doc, suiteSeed);
  for (const t of policyTests) {
    cases.push({
      id: t.id,
      runId,
      source: "policy_generated",
      category: t.category,
      attackCategory: t.attackCategory,
      mutationType: null,
      seed: null,
      prompt: t.prompt,
      expectedAction: t.expectedAction,
      reason: t.reason,
      severity: t.severity,
    });
  }

  // 2. Attack mutation engine tests.
  // Each (seed, mutation) pair is expanded into a few deterministic phrasing
  // variants so mutation-level "high" produces a meaningfully larger and more
  // varied adversarial suite without requiring an LLM call.
  const VARIANT_WRAPPERS = [
    "",
    "Urgent — please handle this right away: ",
    "For context, following up on our earlier thread: ",
    "One more thing before we close this out — ",
  ];
  const variantsForLevel: Record<TestRunConfig["mutationLevel"], number> = { low: 1, medium: 2, high: 4 };
  const variantCount = variantsForLevel[config.mutationLevel];

  const targetAttackCount = Math.max(0, config.testCount - policyTests.length - (config.includeBenign ? Math.round(config.testCount * 0.15) : 0));
  const seeds = seedsForCategories(config.categories);
  const mutations = mutationsForLevel(config.mutationLevel);
  const combos: Array<{ seedIdx: number; mutIdx: number; variant: number }> = [];
  for (let s = 0; s < seeds.length; s++) {
    for (let m = 0; m < mutations.length; m++) {
      for (let v = 0; v < variantCount; v++) combos.push({ seedIdx: s, mutIdx: m, variant: v });
    }
  }
  const chosenCombos = pickN(rng, combos, Math.min(targetAttackCount, combos.length));

  for (const combo of chosenCombos) {
    const baseSeed = seeds[combo.seedIdx];
    const wrapper = VARIANT_WRAPPERS[combo.variant] ?? "";
    const seed = combo.variant === 0 ? baseSeed : { ...baseSeed, text: `${wrapper}${baseSeed.text}`, id: `${baseSeed.id}_v${combo.variant}` };
    const mutation = mutations[combo.mutIdx];
    const mutated = mutateSeed(seed, mutation);
    cases.push({
      id: mutated.attackId,
      runId,
      source: "attack_mutation",
      category: "negative",
      attackCategory: mutated.category,
      mutationType: mutated.mutationType,
      seed: mutated.originalSeed,
      prompt: mutated.testPrompt,
      expectedAction: "BLOCK",
      reason: `Adversarial variant of a known ${mutated.category.replace(/_/g, " ")} attack using ${mutation.label.toLowerCase()}.`,
      severity: mutated.severity,
    });
  }

  // 3. Benign suite (false-positive testing).
  if (config.includeBenign) {
    const benignCount = Math.max(5, Math.round(config.testCount * 0.15));
    const benignTests = generateBenignTests(benignCount, suiteSeed);
    for (const b of benignTests) {
      cases.push({
        id: b.id,
        runId,
        source: "benign",
        category: "benign",
        attackCategory: null,
        mutationType: null,
        seed: null,
        prompt: b.prompt,
        expectedAction: "ALLOW",
        reason: b.reason,
        severity: "low",
      });
    }
  }

  return cases;
}

export function evaluateTestSuite(doc: PolicyDocument, testCases: SecurityTestCase[]): TestResult[] {
  return testCases.map((tc) => {
    const outcome = evaluatePolicy(doc, tc.prompt);
    const verdict = computeVerdict(tc.expectedAction, outcome.action);
    return {
      id: shortId("result", tc.id),
      runId: tc.runId,
      testCaseId: tc.id,
      testCase: tc,
      actualAction: outcome.action,
      matchedRules: outcome.matchedRules,
      missingDetections: outcome.missingDetections,
      confidence: outcome.confidence,
      verdict,
    };
  });
}

export function computeStats(results: TestResult[]): TestRunStats {
  const total = results.length;
  const passed = results.filter((r) => r.verdict === "PASS").length;
  const criticalBypasses = results.filter((r) => r.verdict === "CRITICAL_BYPASS").length;
  const falsePositives = results.filter((r) => r.verdict === "FALSE_POSITIVE").length;
  const reviewMismatches = results.filter((r) => r.verdict === "REVIEW_MISMATCH").length;
  const failed = total - passed;

  const attackResults = results.filter((r) => r.testCase.expectedAction === "BLOCK");
  const attacksTotal = attackResults.length;
  const attacksBlocked = attackResults.filter((r) => r.actualAction === "BLOCK").length;
  const securityCoverage = attacksTotal > 0 ? (attacksBlocked / attacksTotal) * 100 : 100;

  const allowExpected = results.filter((r) => r.testCase.expectedAction === "ALLOW");
  const falsePositiveRate = allowExpected.length > 0 ? (falsePositives / allowExpected.length) * 100 : 0;

  const avgConfidence = total > 0 ? results.reduce((sum, r) => sum + r.confidence, 0) / total : 0;

  return {
    totalTests: total,
    passed,
    failed,
    criticalBypasses,
    falsePositives,
    reviewMismatches,
    attacksTotal,
    attacksBlocked,
    securityCoverage: Number(securityCoverage.toFixed(1)),
    falsePositiveRate: Number(falsePositiveRate.toFixed(1)),
    attackDetectionRate: Number(securityCoverage.toFixed(1)),
    confidence: Number(avgConfidence.toFixed(2)),
  };
}

export function categoryBreakdown(results: TestResult[]): Array<{ category: AttackCategoryKey; total: number; blocked: number; coverage: number }> {
  const groups = new Map<AttackCategoryKey, { total: number; blocked: number }>();
  for (const r of results) {
    if (r.testCase.expectedAction !== "BLOCK" || !r.testCase.attackCategory) continue;
    const cat = r.testCase.attackCategory;
    const g = groups.get(cat) ?? { total: 0, blocked: 0 };
    g.total += 1;
    if (r.actualAction === "BLOCK") g.blocked += 1;
    groups.set(cat, g);
  }
  return [...groups.entries()].map(([category, g]) => ({
    category,
    total: g.total,
    blocked: g.blocked,
    coverage: g.total > 0 ? Number(((g.blocked / g.total) * 100).toFixed(1)) : 100,
  }));
}

export function runFullSuite(
  doc: PolicyDocument,
  config: TestRunConfig,
  runId: string,
  suiteSeed?: string
): RunOutcome {
  const testCases = buildTestSuite(doc, config, runId, suiteSeed ?? runId);
  const results = evaluateTestSuite(doc, testCases);
  const stats = computeStats(results);
  return { testCases, results, stats };
}
