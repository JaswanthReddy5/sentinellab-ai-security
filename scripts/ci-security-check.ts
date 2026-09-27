#!/usr/bin/env tsx
/**
 * SentinelLab CI security regression check.
 *
 * Runs the deterministic policy-testing engine against a policy file and
 * fails (non-zero exit code) if:
 *   - security coverage falls below --threshold, or
 *   - a --baseline policy file is provided and a regression is detected
 *     (previously-blocked attacks now pass).
 *
 * Usage:
 *   npx tsx scripts/ci-security-check.ts --policy policies/prevent_customer_data_leak.v2.yaml \
 *     --baseline policies/prevent_customer_data_leak.v1.yaml --threshold 95
 */
import { readFileSync } from "node:fs";
import { parsePolicy } from "../src/lib/policy/parser";
import { runFullSuite } from "../src/lib/engine/runner";
import { computeRegression } from "../src/lib/engine/regression";
import type { TestRunConfig } from "../src/lib/types";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
}

function loadPolicy(path: string) {
  const raw = readFileSync(path, "utf-8");
  const parsed = parsePolicy(raw);
  if (!parsed.ok || !parsed.document) {
    console.error(`❌ Failed to parse policy at ${path}:`);
    for (const issue of parsed.issues) console.error(`   - ${issue.path}: ${issue.message}`);
    process.exit(1);
  }
  return parsed.document!;
}

function main() {
  const policyPath = arg("policy");
  const baselinePath = arg("baseline");
  const threshold = Number(arg("threshold", "95"));
  const testCount = Number(arg("tests", "500"));

  if (!policyPath) {
    console.error("Usage: ci-security-check --policy <file> [--baseline <file>] [--threshold 95] [--tests 500]");
    process.exit(2);
  }

  const doc = loadPolicy(policyPath);
  const config: TestRunConfig = { policyVersionId: "ci", testCount, categories: [], mutationLevel: "high", includeBenign: true };
  const suiteSeed = "ci-security-check"; // stable across baseline/current so bypass comparisons are meaningful
  const outcome = runFullSuite(doc, config, "ci-current", suiteSeed);

  console.log("");
  console.log(`SentinelLab CI Security Regression Check`);
  console.log(`Policy: ${doc.policy.name} (${doc.policy.version})`);
  console.log(`Test cases: ${outcome.stats.totalTests}`);
  console.log(`Security coverage: ${outcome.stats.securityCoverage}%  (min required: ${threshold}%)`);
  console.log(`False positive rate: ${outcome.stats.falsePositiveRate}%`);
  console.log(`Critical bypasses: ${outcome.results.filter((r) => r.verdict === "CRITICAL_BYPASS").length}`);
  console.log("");

  let failed = false;

  if (outcome.stats.securityCoverage < threshold) {
    console.error(`❌ SECURITY REGRESSION — coverage ${outcome.stats.securityCoverage}% is below the required ${threshold}% threshold.`);
    failed = true;
  }

  if (baselinePath) {
    const baselineDoc = loadPolicy(baselinePath);
    const baselineOutcome = runFullSuite(baselineDoc, config, "ci-baseline", suiteSeed);
    const regression = computeRegression({
      baselineRun: {
        id: "ci-baseline",
        label: "baseline",
        policyId: "ci",
        policyName: baselineDoc.policy.name,
        policyVersionId: "baseline",
        policyVersionLabel: baselineDoc.policy.version,
        config,
        stats: baselineOutcome.stats,
        status: "completed",
        createdAt: new Date(0).toISOString(),
        completedAt: new Date(0).toISOString(),
      },
      baselineResults: baselineOutcome.results,
      currentRun: {
        id: "ci-current",
        label: "current",
        policyId: "ci",
        policyName: doc.policy.name,
        policyVersionId: "current",
        policyVersionLabel: doc.policy.version,
        config,
        stats: outcome.stats,
        status: "completed",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      currentResults: outcome.results,
    });

    console.log(`Baseline (${baselineDoc.policy.version}) coverage: ${regression.previousCoverage}%`);
    console.log(`Current  (${doc.policy.version}) coverage: ${regression.currentCoverage}%`);
    console.log(`Change: ${regression.changePoints >= 0 ? "+" : ""}${regression.changePoints} points`);
    console.log(`New bypasses (previously blocked, now passing): ${regression.newBypassCount}`);
    console.log("");

    if (regression.isRegression) {
      console.error(`❌ SECURITY REGRESSION — ${regression.newBypassCount} previously-blocked attack(s) now bypass the policy.`);
      failed = true;
    }
  }

  if (failed) {
    console.error("");
    console.error("❌ SECURITY REGRESSION — CI FAILED");
    process.exit(1);
  }

  console.log("✅ Security regression check passed.");
}

main();
