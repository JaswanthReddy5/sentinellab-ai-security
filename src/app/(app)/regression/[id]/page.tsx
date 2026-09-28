import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, severityTone } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { FlowDiagram, type FlowStep } from "@/components/ui/FlowDiagram";
import { BypassInvestigationCard } from "@/components/investigation/BypassInvestigationCard";
import { pickTopBypass } from "@/lib/engine/regression";
import { buildEvaluationChecklist } from "@/lib/engine/checklist";
import { getCategoryRecommendation } from "@/lib/engine/recommend";
import { categoryLabel } from "@/lib/categories";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegressionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const regression = await store.getRegression(id);
  if (!regression) notFound();

  const currentRun = await store.getRun(regression.currentRunId);
  const currentVersion = currentRun ? await store.getPolicyVersion(currentRun.policyVersionId) : null;

  const topBypass = pickTopBypass(regression);
  const worstCategory = [...regression.categoryComparison].sort((a, b) => a.delta - b.delta)[0] ?? null;

  let currentResult = null;
  let baselineResult = null;
  if (topBypass) {
    const [baselineResults, currentResults] = await Promise.all([
      store.getRunResults(regression.baselineRunId),
      store.getRunResults(regression.currentRunId),
    ]);
    currentResult = currentResults.find((r) => r.testCaseId === topBypass.testCaseId) ?? null;
    baselineResult = baselineResults.find((r) => r.testCaseId === topBypass.testCaseId) ?? null;
  }

  const flowSteps: FlowStep[] = [
    { label: "Policy", value: currentRun?.policyName ?? regression.currentLabel.split(" ")[0] },
    { label: "Changed From", value: regression.baselineLabel },
    { label: "Ran", value: `${currentRun?.stats.totalTests ?? "—"} Tests` },
    { label: "Compared With", value: regression.baselineLabel },
    {
      label: regression.isRegression ? "🚨 Regression" : "✅ No Regression",
      value: `${regression.previousCoverage}% → ${regression.currentCoverage}%`,
      tone: regression.isRegression ? "danger" : "success",
    },
  ];
  if (regression.isRegression) {
    flowSteps.push({ label: "New Bypasses", value: regression.newBypassCount, tone: "danger" });
    flowSteps.push({ label: "Why?", value: "Category-level breakdown below", tone: "warning" });
    if (worstCategory) {
      flowSteps.push({
        label: "Worst-Hit Category",
        value: `${categoryLabel(worstCategory.category)} (${worstCategory.delta}%)`,
        tone: "warning",
      });
    }
    if (topBypass) {
      flowSteps.push({ label: "Exact Attack", value: truncate(topBypass.prompt, 70), mono: true });
      flowSteps.push({ label: "Root Cause + Fix", value: "Shown below", tone: "accent" });
    }
  }

  return (
    <>
      <PageHeader
        title="Security Regression Report"
        description={`${regression.baselineLabel} → ${regression.currentLabel}`}
      />

      <FlowDiagram steps={flowSteps} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Previous Coverage" value={`${regression.previousCoverage}%`} />
        <StatTile label="Current Coverage" value={`${regression.currentCoverage}%`} accent={regression.changePoints < 0 ? "danger" : "success"} />
        <StatTile
          label="Change"
          value={`${regression.changePoints >= 0 ? "+" : ""}${regression.changePoints} pts`}
          accent={regression.changePoints < 0 ? "danger" : "success"}
        />
        <StatTile label="New Bypasses" value={String(regression.newBypassCount)} accent={regression.newBypassCount > 0 ? "danger" : "success"} />
      </div>

      {regression.categoryComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category-Level Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH>Previous</TH>
                  <TH>Current</TH>
                  <TH>Δ</TH>
                </TR>
              </THead>
              <TBody>
                {regression.categoryComparison.map((c) => (
                  <TR key={c.category} className={worstCategory && c.category === worstCategory.category ? "bg-danger/5" : undefined}>
                    <TD>{categoryLabel(c.category)}</TD>
                    <TD>{c.baseline}%</TD>
                    <TD>{c.current}%</TD>
                    <TD className={c.delta < 0 ? "text-danger" : "text-success"}>
                      {c.delta >= 0 ? "+" : ""}
                      {c.delta}%
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {topBypass && currentResult && currentVersion && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Why? — {categoryLabel(topBypass.attackCategory)}</CardTitle>
              <CardDescription>The single highest-severity bypass driving this regression, with root cause and a suggested fix.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BypassInvestigationCard
              categoryLabel={categoryLabel(topBypass.attackCategory)}
              severity={topBypass.severity}
              mutationType={topBypass.mutationType}
              prompt={topBypass.prompt}
              expectedAction={currentResult.testCase.expectedAction}
              previousAction={baselineResult?.actualAction ?? topBypass.previousAction}
              currentAction={currentResult.actualAction}
              checklist={buildEvaluationChecklist(currentVersion.document, topBypass.attackCategory)}
              rootCause={
                getCategoryRecommendation(topBypass.attackCategory, currentVersion.document.policy.name)?.problem ??
                "The current policy no longer applies a control strong enough to block this test case."
              }
              recommendation={getCategoryRecommendation(topBypass.attackCategory, currentVersion.document.policy.name)}
            />
          </CardContent>
        </Card>
      )}

      {regression.newBypasses.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>All New Bypasses ({regression.newBypasses.length})</CardTitle>
              <CardDescription>Every previously-blocked case that started passing — click any row to investigate it individually.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH>Mutation</TH>
                  <TH>Prompt</TH>
                  <TH>Severity</TH>
                  <TH>Previous</TH>
                  <TH>Current</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {regression.newBypasses.map((b) => (
                  <TR key={b.testCaseId}>
                    <TD className="text-xs">{categoryLabel(b.attackCategory)}</TD>
                    <TD className="text-xs text-muted">{b.mutationType ?? "—"}</TD>
                    <TD className="max-w-md text-xs text-muted">{truncate(b.prompt, 60)}</TD>
                    <TD>
                      <Badge tone={severityTone(b.severity)}>{b.severity}</Badge>
                    </TD>
                    <TD className="text-success">{b.previousAction}</TD>
                    <TD className="text-danger">{b.currentAction}</TD>
                    <TD>
                      <Link href={`/regression/${regression.id}/bypass/${b.testCaseId}`} className="text-xs font-medium text-accent hover:underline">
                        Investigate →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-2">
        <Link href="/regression" className="text-accent hover:underline">
          ← Back to regression comparison
        </Link>
      </p>
    </>
  );
}
