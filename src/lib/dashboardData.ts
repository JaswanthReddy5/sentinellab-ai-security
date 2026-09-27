import { getStore } from "./data/store";
import { categoryBreakdown } from "./engine/runner";
import type { DashboardSummary } from "./types";

export async function buildDashboardSummary(): Promise<DashboardSummary> {
  const store = getStore();
  const [runs, regressions] = await Promise.all([store.listRuns(), store.listRegressions()]);

  const sortedRuns = [...runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = sortedRuns[sortedRuns.length - 1];

  if (!latest) {
    return {
      securityCoverage: 0,
      attackDetection: { blocked: 0, total: 0 },
      falsePositiveRate: 0,
      securityRegressions: 0,
      criticalBypasses: 0,
      testCases: 0,
      policyVersion: "—",
      coverageTrend: [],
      falsePositiveTrend: [],
      categoryPerformance: [],
      regressionTrend: [],
      recentRuns: [],
    };
  }

  const latestResults = await store.getRunResults(latest.id);
  const criticalBypasses = latestResults.filter(
    (r) => r.verdict === "CRITICAL_BYPASS" && (r.testCase.severity === "critical" || r.testCase.severity === "high")
  ).length;

  const coverageTrend = sortedRuns.map((r) => ({
    label: r.policyVersionLabel,
    coverage: r.stats.securityCoverage,
    date: r.createdAt,
  }));

  const falsePositiveTrend = sortedRuns.map((r) => ({
    label: r.policyVersionLabel,
    rate: r.stats.falsePositiveRate,
    date: r.createdAt,
  }));

  const regressionTrend = sortedRuns.map((r) => {
    const relevant = regressions.filter((rg) => rg.currentRunId === r.id);
    return { label: r.policyVersionLabel, regressions: relevant.reduce((sum, rg) => sum + rg.newBypassCount, 0) };
  });

  const categoryPerformance = categoryBreakdown(latestResults).map((c) => ({ category: c.category, coverage: c.coverage }));

  const securityRegressions = regressions.filter((r) => r.isRegression).length;

  return {
    securityCoverage: latest.stats.securityCoverage,
    attackDetection: { blocked: latest.stats.attacksBlocked, total: latest.stats.attacksTotal },
    falsePositiveRate: latest.stats.falsePositiveRate,
    securityRegressions,
    criticalBypasses,
    testCases: latest.stats.totalTests,
    policyVersion: latest.policyVersionLabel,
    coverageTrend,
    falsePositiveTrend,
    categoryPerformance,
    regressionTrend,
    recentRuns: [...sortedRuns].reverse().slice(0, 8),
  };
}
