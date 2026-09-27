import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { BypassInvestigationCard } from "@/components/investigation/BypassInvestigationCard";
import { buildEvaluationChecklist } from "@/lib/engine/checklist";
import { getCategoryRecommendation } from "@/lib/engine/recommend";
import { categoryLabel } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function BypassInvestigationPage({
  params,
}: {
  params: Promise<{ id: string; testCaseId: string }>;
}) {
  const { id, testCaseId } = await params;
  const store = getStore();
  const regression = await store.getRegression(id);
  if (!regression) notFound();

  const [baselineRun, currentRun] = await Promise.all([store.getRun(regression.baselineRunId), store.getRun(regression.currentRunId)]);
  if (!baselineRun || !currentRun) notFound();

  const [baselineResults, currentResults, currentVersion] = await Promise.all([
    store.getRunResults(baselineRun.id),
    store.getRunResults(currentRun.id),
    store.getPolicyVersion(currentRun.policyVersionId),
  ]);

  const baselineResult = baselineResults.find((r) => r.testCaseId === testCaseId);
  const currentResult = currentResults.find((r) => r.testCaseId === testCaseId);
  if (!currentResult || !currentVersion) notFound();

  const category = currentResult.testCase.attackCategory;
  const checklist = buildEvaluationChecklist(currentVersion.document, category);
  const recommendation = getCategoryRecommendation(category, currentVersion.document.policy.name);

  const rootCause =
    recommendation?.problem ??
    "The current policy no longer applies a control strong enough to block this test case, and no equivalent control compensates for the gap.";

  return (
    <>
      <PageHeader
        title="Why Did This Bypass Happen?"
        description={`${regression.baselineLabel} → ${regression.currentLabel} · ${categoryLabel(category)}`}
      />
      <Card>
        <CardContent>
          <BypassInvestigationCard
            categoryLabel={categoryLabel(category)}
            severity={currentResult.testCase.severity}
            mutationType={currentResult.testCase.mutationType}
            prompt={currentResult.testCase.prompt}
            expectedAction={currentResult.testCase.expectedAction}
            previousAction={baselineResult?.actualAction ?? null}
            currentAction={currentResult.actualAction}
            checklist={checklist}
            rootCause={rootCause}
            recommendation={recommendation}
          />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-2">
        <Link href={`/regression/${regression.id}`} className="text-accent hover:underline">
          ← Back to regression report
        </Link>
      </p>
    </>
  );
}
