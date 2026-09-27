import { PrismaClient, Prisma } from "@prisma/client";
import { buildSeedBundle } from "../src/lib/data/seedData";
import { ATTACK_CATEGORIES } from "../src/lib/categories";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SentinelLab demo dataset into Postgres...");
  const bundle = buildSeedBundle();

  await prisma.attackCategory.createMany({
    data: ATTACK_CATEGORIES.map((c) => ({ key: c.key, label: c.label, description: c.description })),
    skipDuplicates: true,
  });

  for (const policy of bundle.policies) {
    await prisma.policy.upsert({
      where: { slug: policy.slug },
      update: {},
      create: {
        id: policy.id,
        name: policy.name,
        slug: policy.slug,
        description: policy.description,
        createdAt: new Date(policy.createdAt),
        updatedAt: new Date(policy.updatedAt),
        versions: {
          create: policy.versions.map((v) => ({
            id: v.id,
            label: v.label,
            document: v.document as unknown as Prisma.InputJsonValue,
            raw: v.raw,
            format: v.format,
            isActive: v.isActive,
            createdAt: new Date(v.createdAt),
          })),
        },
      },
    });
  }

  for (const run of bundle.runs) {
    const results = bundle.resultsByRun[run.id] ?? [];
    await prisma.testRun.upsert({
      where: { id: run.id },
      update: {},
      create: {
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
    });

    await prisma.securityTest.createMany({
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
      skipDuplicates: true,
    });

    await prisma.testResult.createMany({
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
      skipDuplicates: true,
    });
    console.log(`  seeded run ${run.id} (${run.policyVersionLabel}) with ${results.length} results`);
  }

  for (const regression of bundle.regressions) {
    await prisma.regression.upsert({
      where: { id: regression.id },
      update: {},
      create: {
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
  }

  await prisma.recommendation.createMany({
    data: bundle.recommendations.map((r) => ({
      id: r.id,
      runId: r.runId,
      category: r.category,
      severity: r.severity,
      problem: r.problem,
      recommendation: r.recommendation,
      policySnippet: r.policySnippet,
      createdAt: new Date(r.createdAt),
    })),
    skipDuplicates: true,
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
