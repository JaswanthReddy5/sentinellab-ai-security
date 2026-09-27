import type {
  AttackCategoryKey,
  EvalAction,
  MutationType,
  Policy,
  PolicyVersion,
  Recommendation,
  Regression,
  Severity,
  TestCategory,
  TestResult,
  TestRun,
  TestSource,
} from "../types";
import type { CreatePolicyInput, DataStore } from "./types";
import { prisma } from "./prismaClient";
import { parsePolicy } from "../policy/parser";
import { logger } from "../logger";
import type { Prisma, Policy as PolicyRow, PolicyVersion as PolicyVersionRow, TestRun as TestRunRow, SecurityTest as SecurityTestRow, TestResult as TestResultRow, Regression as RegressionRow, Recommendation as RecommendationRow } from "@prisma/client";

function toPolicy(row: PolicyRow & { versions: PolicyVersionRow[] }): Policy {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    versions: row.versions.map(toPolicyVersion),
  };
}

function toPolicyVersion(row: PolicyVersionRow): PolicyVersion {
  return {
    id: row.id,
    policyId: row.policyId,
    label: row.label,
    document: row.document as unknown as PolicyVersion["document"],
    raw: row.raw,
    format: row.format as "yaml" | "json",
    createdAt: row.createdAt.toISOString(),
    isActive: row.isActive,
  };
}

function toTestRun(row: TestRunRow): TestRun {
  return {
    id: row.id,
    label: row.label,
    policyId: row.policyId,
    policyName: row.policyName,
    policyVersionId: row.policyVersionId,
    policyVersionLabel: row.policyVersionLabel,
    config: row.config as unknown as TestRun["config"],
    stats: row.stats as unknown as TestRun["stats"],
    status: row.status as TestRun["status"],
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

function toTestResult(row: TestResultRow & { test: SecurityTestRow }): TestResult {
  const t = row.test;
  return {
    id: row.id,
    runId: row.runId,
    testCaseId: row.testCaseId,
    testCase: {
      id: t.id,
      runId: t.runId,
      source: t.source as TestSource,
      category: t.category as TestCategory,
      attackCategory: t.attackCategory as AttackCategoryKey | null,
      mutationType: t.mutationType as MutationType | null,
      seed: t.seed,
      prompt: t.prompt,
      expectedAction: t.expectedAction as EvalAction,
      reason: t.reason,
      severity: t.severity as Severity,
    },
    actualAction: row.actualAction as EvalAction,
    matchedRules: row.matchedRules as unknown as string[],
    missingDetections: row.missingDetections as unknown as string[],
    confidence: row.confidence,
    verdict: row.verdict as TestResult["verdict"],
  };
}

function toRegression(row: RegressionRow & { baselineRun: TestRunRow; currentRun: TestRunRow }): Regression {
  return {
    id: row.id,
    baselineRunId: row.baselineRunId,
    currentRunId: row.currentRunId,
    baselineLabel: `${row.baselineRun.policyName} ${row.baselineRun.policyVersionLabel}`,
    currentLabel: `${row.currentRun.policyName} ${row.currentRun.policyVersionLabel}`,
    previousCoverage: row.previousCoverage,
    currentCoverage: row.currentCoverage,
    changePoints: row.changePoints,
    newBypassCount: row.newBypassCount,
    newBypasses: row.newBypasses as unknown as Regression["newBypasses"],
    categoryComparison: row.categoryComparison as unknown as Regression["categoryComparison"],
    isRegression: row.isRegression,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRecommendation(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    runId: row.runId,
    category: row.category as AttackCategoryKey | null,
    severity: row.severity as Severity,
    problem: row.problem,
    recommendation: row.recommendation,
    policySnippet: row.policySnippet,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaStore implements DataStore {
  kind = "prisma" as const;

  async listPolicies(): Promise<Policy[]> {
    const rows = await prisma.policy.findMany({ include: { versions: true }, orderBy: { updatedAt: "desc" } });
    return rows.map(toPolicy);
  }

  async getPolicy(id: string): Promise<Policy | null> {
    const row = await prisma.policy.findUnique({ where: { id }, include: { versions: true } });
    return row ? toPolicy(row) : null;
  }

  async getPolicyBySlug(slug: string): Promise<Policy | null> {
    const row = await prisma.policy.findUnique({ where: { slug }, include: { versions: true } });
    return row ? toPolicy(row) : null;
  }

  async createPolicy(input: CreatePolicyInput): Promise<Policy> {
    const parsed = parsePolicy(input.raw);
    if (!parsed.ok || !parsed.document) throw new Error(parsed.issues.map((i) => i.message).join("; "));
    const doc = parsed.document;
    const slug = doc.policy.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const row = await prisma.policy.create({
      data: {
        name: doc.policy.name,
        slug,
        description: doc.policy.description ?? "",
        versions: {
          create: [
            {
              label: `v${doc.policy.version}`,
              document: doc as unknown as Prisma.InputJsonValue,
              raw: input.raw,
              format: input.format,
              isActive: true,
            },
          ],
        },
      },
      include: { versions: true },
    });
    logger.info("policy_created", { policyId: row.id, name: row.name });
    return toPolicy(row);
  }

  async addPolicyVersion(policyId: string, input: CreatePolicyInput): Promise<PolicyVersion> {
    const parsed = parsePolicy(input.raw);
    if (!parsed.ok || !parsed.document) throw new Error(parsed.issues.map((i) => i.message).join("; "));
    const doc = parsed.document;

    await prisma.policyVersion.updateMany({ where: { policyId }, data: { isActive: false } });
    const row = await prisma.policyVersion.create({
      data: {
        policyId,
        label: `v${doc.policy.version}`,
        document: doc as unknown as Prisma.InputJsonValue,
        raw: input.raw,
        format: input.format,
        isActive: true,
      },
    });
    await prisma.policy.update({ where: { id: policyId }, data: { updatedAt: new Date() } });
    logger.info("policy_version_added", { policyId, versionId: row.id, label: row.label });
    return toPolicyVersion(row);
  }

  async getPolicyVersion(id: string): Promise<PolicyVersion | null> {
    const row = await prisma.policyVersion.findUnique({ where: { id } });
    return row ? toPolicyVersion(row) : null;
  }

  async listRuns(): Promise<TestRun[]> {
    const rows = await prisma.testRun.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toTestRun);
  }

  async getRun(id: string): Promise<TestRun | null> {
    const row = await prisma.testRun.findUnique({ where: { id } });
    return row ? toTestRun(row) : null;
  }

  async getRunResults(id: string): Promise<TestResult[]> {
    const rows = await prisma.testResult.findMany({ where: { runId: id }, include: { test: true } });
    return rows.map(toTestResult);
  }

  async createRun(run: TestRun, results: TestResult[]): Promise<void> {
    await prisma.$transaction([
      prisma.testRun.create({
        data: {
          id: run.id,
          label: run.label,
          policyId: run.policyId,
          policyName: run.policyName,
          policyVersionId: run.policyVersionId,
          policyVersionLabel: run.policyVersionLabel,
          config: run.config as unknown as Prisma.InputJsonValue,
          stats: run.stats as unknown as Prisma.InputJsonValue,
          status: run.status,
          createdAt: new Date(run.createdAt),
          completedAt: run.completedAt ? new Date(run.completedAt) : null,
        },
      }),
      prisma.securityTest.createMany({
        data: results.map((r) => ({
          id: r.testCase.id,
          runId: run.id,
          source: r.testCase.source,
          category: r.testCase.category,
          attackCategory: r.testCase.attackCategory,
          mutationType: r.testCase.mutationType,
          seed: r.testCase.seed,
          prompt: r.testCase.prompt,
          expectedAction: r.testCase.expectedAction,
          reason: r.testCase.reason,
          severity: r.testCase.severity,
        })),
      }),
      prisma.testResult.createMany({
        data: results.map((r) => ({
          id: r.id,
          runId: run.id,
          testCaseId: r.testCaseId,
          actualAction: r.actualAction,
          matchedRules: r.matchedRules as unknown as Prisma.InputJsonValue,
          missingDetections: r.missingDetections as unknown as Prisma.InputJsonValue,
          confidence: r.confidence,
          verdict: r.verdict,
        })),
      }),
    ]);
    logger.info("test_run_created", { runId: run.id, policyId: run.policyId, totalTests: run.stats.totalTests });
  }

  async listRegressions(): Promise<Regression[]> {
    const rows = await prisma.regression.findMany({
      include: { baselineRun: true, currentRun: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRegression);
  }

  async saveRegression(regression: Regression): Promise<void> {
    await prisma.regression.create({
      data: {
        id: regression.id,
        baselineRunId: regression.baselineRunId,
        currentRunId: regression.currentRunId,
        previousCoverage: regression.previousCoverage,
        currentCoverage: regression.currentCoverage,
        changePoints: regression.changePoints,
        newBypassCount: regression.newBypassCount,
        newBypasses: regression.newBypasses as unknown as Prisma.InputJsonValue,
        categoryComparison: regression.categoryComparison as unknown as Prisma.InputJsonValue,
        isRegression: regression.isRegression,
        createdAt: new Date(regression.createdAt),
      },
    });
    logger.info("regression_calculated", { regressionId: regression.id, isRegression: regression.isRegression });
  }

  async listRecommendations(runId?: string): Promise<Recommendation[]> {
    const rows = await prisma.recommendation.findMany({ where: runId ? { runId } : undefined, orderBy: { createdAt: "desc" } });
    return rows.map(toRecommendation);
  }

  async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
    if (!recommendations.length) return;
    await prisma.recommendation.createMany({
      data: recommendations.map((r) => ({
        id: r.id,
        runId: r.runId,
        category: r.category,
        severity: r.severity,
        problem: r.problem,
        recommendation: r.recommendation,
        policySnippet: r.policySnippet,
        createdAt: new Date(r.createdAt),
      })),
    });
  }
}
