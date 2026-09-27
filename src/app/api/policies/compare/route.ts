import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data/store";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { runFullSuite, categoryBreakdown } from "@/lib/engine/runner";
import { computeRegression } from "@/lib/engine/regression";
import { diffPolicies, computeRuleImpact } from "@/lib/engine/policyDiff";
import { shortId } from "@/lib/rng";
import { logger } from "@/lib/logger";
import type { TestRun, TestRunConfig } from "@/lib/types";

const compareSchema = z.object({
  baselineVersionId: z.string().min(1),
  currentVersionId: z.string().min(1),
  testCount: z.number().int().min(20).max(2000).optional().default(400),
  mutationLevel: z.enum(["low", "medium", "high"]).optional().default("high"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = compareSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const [baselineVersion, currentVersion] = await Promise.all([
      store.getPolicyVersion(parsed.data.baselineVersionId),
      store.getPolicyVersion(parsed.data.currentVersionId),
    ]);
    if (!baselineVersion) return jsonError("Baseline policy version not found", 404);
    if (!currentVersion) return jsonError("Current policy version not found", 404);

    // Both versions are evaluated against the IDENTICAL generated test suite —
    // the suite seed is derived from the pair of version IDs so the
    // comparison is apples-to-apples even across different policies.
    const suiteSeed = `compare:${[baselineVersion.id, currentVersion.id].sort().join(":")}`;
    const config: TestRunConfig = {
      policyVersionId: "",
      testCount: parsed.data.testCount,
      categories: [],
      mutationLevel: parsed.data.mutationLevel,
      includeBenign: true,
    };

    const baselineOutcome = runFullSuite(baselineVersion.document, { ...config, policyVersionId: baselineVersion.id }, "compare-baseline", suiteSeed);
    const currentOutcome = runFullSuite(currentVersion.document, { ...config, policyVersionId: currentVersion.id }, "compare-current", suiteSeed);

    const now = new Date().toISOString();
    const baselineRun: TestRun = {
      id: shortId("cmp", `${suiteSeed}:baseline`),
      label: "Comparison baseline",
      policyId: baselineVersion.policyId,
      policyName: baselineVersion.label,
      policyVersionId: baselineVersion.id,
      policyVersionLabel: baselineVersion.label,
      config: { ...config, policyVersionId: baselineVersion.id },
      stats: baselineOutcome.stats,
      status: "completed",
      createdAt: now,
      completedAt: now,
    };
    const currentRun: TestRun = {
      ...baselineRun,
      id: shortId("cmp", `${suiteSeed}:current`),
      label: "Comparison current",
      policyId: currentVersion.policyId,
      policyName: currentVersion.label,
      policyVersionId: currentVersion.id,
      policyVersionLabel: currentVersion.label,
      config: { ...config, policyVersionId: currentVersion.id },
      stats: currentOutcome.stats,
    };

    const regression = computeRegression({
      baselineRun,
      baselineResults: baselineOutcome.results,
      currentRun,
      currentResults: currentOutcome.results,
    });

    const diff = diffPolicies(baselineVersion.document, currentVersion.document);
    const ruleImpact = computeRuleImpact(diff, baselineOutcome.results, currentOutcome.results);
    const baselineCategoryBreakdown = categoryBreakdown(baselineOutcome.results);
    const currentCategoryBreakdown = categoryBreakdown(currentOutcome.results);

    logger.info("policy_compare_completed", {
      baselineVersionId: baselineVersion.id,
      currentVersionId: currentVersion.id,
      isRegression: regression.isRegression,
    });

    return NextResponse.json({
      baselineRun,
      currentRun,
      regression,
      diff,
      ruleImpact,
      baselineCategoryBreakdown,
      currentCategoryBreakdown,
    });
  } catch (err) {
    return handleUnknownError(err, "Failed to compare policy versions");
  }
}
