import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, severityTone } from "@/components/ui/Badge";
import { RunResultsExplorer } from "@/components/runs/RunResultsExplorer";
import { LinkButton } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import { FileText, GitCompareArrows } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const run = await store.getRun(id);
  if (!run) notFound();

  const [results, recommendations, allRuns] = await Promise.all([
    store.getRunResults(id),
    store.listRecommendations(id),
    store.listRuns(),
  ]);

  const priorRun = allRuns
    .filter((r) => r.policyId === run.policyId && r.createdAt < run.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <>
      <PageHeader
        title={`Run ${run.id}`}
        description={`${run.policyName} — ${run.policyVersionLabel} · ${formatDateTime(run.createdAt)}`}
        actions={
          <div className="flex gap-2">
            {priorRun && (
              <LinkButton href={`/regression?baseline=${priorRun.id}&current=${run.id}`} variant="secondary">
                <GitCompareArrows size={14} /> View Regression
              </LinkButton>
            )}
            <LinkButton href={`/reports/${run.id}`} variant="primary">
              <FileText size={14} /> Generate Report
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Security Coverage" value={`${run.stats.securityCoverage}%`} accent={run.stats.securityCoverage >= 95 ? "success" : "warning"} />
        <StatTile label="Attack Detection" value={`${run.stats.attacksBlocked} / ${run.stats.attacksTotal}`} />
        <StatTile label="False Positive Rate" value={`${run.stats.falsePositiveRate}%`} accent={run.stats.falsePositiveRate > 5 ? "danger" : "success"} />
        <StatTile label="Critical Bypasses" value={String(run.stats.criticalBypasses)} accent={run.stats.criticalBypasses > 0 ? "danger" : "success"} />
        <StatTile label="Total Tests" value={String(run.stats.totalTests)} />
        <StatTile label="Passed" value={String(run.stats.passed)} accent="success" />
        <StatTile label="Failed" value={String(run.stats.failed)} accent="danger" />
        <StatTile label="Avg Confidence" value={`${(run.stats.confidence * 100).toFixed(0)}%`} />
      </div>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Suggested Policy Improvements</CardTitle>
              <CardDescription>Generated from this run&apos;s failures — copy the YAML snippet into your next policy version.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-border-soft bg-surface-2/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={severityTone(rec.severity)}>{rec.severity}</Badge>
                  <span className="text-xs font-medium text-foreground">{rec.problem}</span>
                </div>
                <p className="mb-2 text-xs text-muted">{rec.recommendation}</p>
                <pre className="mono overflow-x-auto rounded bg-black/40 p-2 text-[11px] text-foreground/80">{rec.policySnippet}</pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Click any row to inspect expected vs. actual and matched detection rules.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <RunResultsExplorer results={results} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-2">
        Looking for run history? <Link href="/runs" className="text-accent hover:underline">Back to all runs</Link>
      </p>
    </>
  );
}
