import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { runTestSchema } from "@/lib/validation";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { runFullSuite } from "@/lib/engine/runner";
import { computeRegression } from "@/lib/engine/regression";
import { generateRecommendations } from "@/lib/engine/recommend";
import { shortId } from "@/lib/rng";
import { logger } from "@/lib/logger";
import type { TestRun, TestRunConfig } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: policyId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const parsed = runTestSchema.safeParse({ ...body, policyVersionId: body.policyVersionId });
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const policy = await store.getPolicy(policyId);
    if (!policy) return jsonError("Policy not found", 404);

    const version = policy.versions.find((v) => v.id === parsed.data.policyVersionId) ?? policy.versions.find((v) => v.isActive) ?? policy.versions[policy.versions.length - 1];
    if (!version) return jsonError("Policy has no versions to test", 400);

    logger.info("test_run_started", { policyId, versionId: version.id, testCount: parsed.data.testCount });

    const config: TestRunConfig = {
      policyVersionId: version.id,
      testCount: parsed.data.testCount,
      categories: parsed.data.categories,
      mutationLevel: parsed.data.mutationLevel,
      includeBenign: parsed.data.includeBenign,
    };

    const runId = shortId("run", `${policyId}:${version.id}:${Date.now()}:${Math.random()}`);
    const outcome = runFullSuite(version.document, config, runId, policyId);
    logger.info("test_generation_completed", { runId, totalTests: outcome.testCases.length });
    logger.info("evaluation_completed", { runId, passed: outcome.stats.passed, failed: outcome.stats.failed });

    const now = new Date().toISOString();
    const run: TestRun = {
      id: runId,
      label: `Manual run — ${version.label}`,
      policyId,
      policyName: policy.name,
      policyVersionId: version.id,
      policyVersionLabel: version.label,
      config,
      stats: outcome.stats,
      status: "completed",
      createdAt: now,
      completedAt: now,
    };
    await store.createRun(run, outcome.results);

    const recommendations = generateRecommendations(run.id, policy.name, outcome.results);
    await store.saveRecommendations(recommendations);

    // Compare against the most recent prior run of this policy, if any.
    const allRuns = await store.listRuns();
    const priorRun = allRuns
      .filter((r) => r.policyId === policyId && r.id !== run.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    let regression = null;
    if (priorRun) {
      const priorResults = await store.getRunResults(priorRun.id);
      regression = computeRegression({
        baselineRun: priorRun,
        baselineResults: priorResults,
        currentRun: run,
        currentResults: outcome.results,
      });
      await store.saveRegression(regression);
      logger.info("regression_calculation_completed", { regressionId: regression.id, isRegression: regression.isRegression });
    }

    return NextResponse.json({ run, results: outcome.results, regression, recommendations }, { status: 201 });
  } catch (err) {
    logger.error("test_run_failed", { error: err instanceof Error ? err.message : "unknown" });
    return handleUnknownError(err, "Failed to run security test");
  }
}
