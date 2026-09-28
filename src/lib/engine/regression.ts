import type { AttackCategoryKey, Regression, RegressionBypass, TestResult, TestRun } from "../types";
import { shortId } from "../rng";

const REGRESSION_THRESHOLD_POINTS = 0.05; // any coverage drop counts as a regression signal

export interface RegressionInput {
  baselineRun: TestRun;
  baselineResults: TestResult[];
  currentRun: TestRun;
  currentResults: TestResult[];
}

export function computeRegression(input: RegressionInput): Regression {
  const { baselineRun, baselineResults, currentRun, currentResults } = input;

  const baselineById = new Map(baselineResults.map((r) => [r.testCaseId, r]));
  const currentById = new Map(currentResults.map((r) => [r.testCaseId, r]));

  const newBypasses: RegressionBypass[] = [];
  for (const [testCaseId, baseResult] of baselineById.entries()) {
    const curResult = currentById.get(testCaseId);
    if (!curResult) continue;
    const wasBlockedCorrectly = baseResult.testCase.expectedAction === "BLOCK" && baseResult.actualAction === "BLOCK";
    const nowBypassed = curResult.testCase.expectedAction === "BLOCK" && curResult.actualAction !== "BLOCK";
    if (wasBlockedCorrectly && nowBypassed) {
      newBypasses.push({
        testCaseId,
        prompt: curResult.testCase.prompt,
        attackCategory: curResult.testCase.attackCategory,
        mutationType: curResult.testCase.mutationType,
        severity: curResult.testCase.severity,
        previousAction: baseResult.actualAction,
        currentAction: curResult.actualAction,
      });
    }
  }

  // Category-level comparison across the shared test set.
  const categories = new Map<AttackCategoryKey, { baseTotal: number; baseBlocked: number; curTotal: number; curBlocked: number }>();
  for (const [testCaseId, baseResult] of baselineById.entries()) {
    const curResult = currentById.get(testCaseId);
    if (!curResult || !baseResult.testCase.attackCategory) continue;
    if (baseResult.testCase.expectedAction !== "BLOCK") continue;
    const cat = baseResult.testCase.attackCategory;
    const g = categories.get(cat) ?? { baseTotal: 0, baseBlocked: 0, curTotal: 0, curBlocked: 0 };
    g.baseTotal += 1;
    if (baseResult.actualAction === "BLOCK") g.baseBlocked += 1;
    g.curTotal += 1;
    if (curResult.actualAction === "BLOCK") g.curBlocked += 1;
    categories.set(cat, g);
  }

  const categoryComparison = [...categories.entries()].map(([category, g]) => {
    const baseline = g.baseTotal > 0 ? Number(((g.baseBlocked / g.baseTotal) * 100).toFixed(1)) : 100;
    const current = g.curTotal > 0 ? Number(((g.curBlocked / g.curTotal) * 100).toFixed(1)) : 100;
    return { category, baseline, current, delta: Number((current - baseline).toFixed(1)) };
  });

  const previousCoverage = baselineRun.stats.securityCoverage;
  const currentCoverage = currentRun.stats.securityCoverage;
  const changePoints = Number((currentCoverage - previousCoverage).toFixed(1));

  return {
    id: shortId("regr", `${baselineRun.id}:${currentRun.id}`),
    baselineRunId: baselineRun.id,
    currentRunId: currentRun.id,
    baselineLabel: `${baselineRun.policyName} ${baselineRun.policyVersionLabel}`,
    currentLabel: `${currentRun.policyName} ${currentRun.policyVersionLabel}`,
    previousCoverage,
    currentCoverage,
    changePoints,
    newBypassCount: newBypasses.length,
    newBypasses: newBypasses.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity)),
    categoryComparison,
    isRegression: changePoints < -REGRESSION_THRESHOLD_POINTS || newBypasses.length > 0,
    createdAt: new Date().toISOString(),
  };
}

function severityWeight(s: string): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0;
}

/**
 * Picks one representative "exact attack" to showcase for a regression:
 * the highest-severity bypass in the worst-hit category, falling back to
 * the highest-severity bypass overall. Used to connect "a regression was
 * detected" directly to "here is the specific attack that got through"
 * without requiring an extra click to find one.
 */
export function pickTopBypass(regression: Regression) {
  if (regression.newBypasses.length === 0) return null;
  const worstCategory = [...regression.categoryComparison].sort((a, b) => a.delta - b.delta)[0] ?? null;
  if (worstCategory) {
    const inCategory = regression.newBypasses.filter((b) => b.attackCategory === worstCategory.category);
    if (inCategory.length > 0) return inCategory[0];
  }
  return regression.newBypasses[0];
}
