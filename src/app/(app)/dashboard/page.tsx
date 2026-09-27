import Link from "next/link";
import { ShieldCheck, Crosshair, TriangleAlert, GitCompareArrows, FlaskConical, Tag } from "lucide-react";
import { buildDashboardSummary } from "@/lib/dashboardData";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, actionTone } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { CoverageTrendChart } from "@/components/charts/CoverageTrendChart";
import { FalsePositiveChart } from "@/components/charts/FalsePositiveChart";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { RegressionTrendChart } from "@/components/charts/RegressionTrendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { LinkButton } from "@/components/ui/Button";

export default async function DashboardPage() {
  const summary = await buildDashboardSummary();
  const hasData = summary.recentRuns.length > 0;

  return (
    <>
      <PageHeader
        title="Security Dashboard"
        description="Real-time posture across your AI security policies — coverage, false positives, and regressions at a glance."
        actions={
          <LinkButton href="/runs" variant="primary">
            <FlaskConical size={14} /> Run Security Test
          </LinkButton>
        }
      />

      {!hasData ? (
        <EmptyState
          title="No test runs yet"
          description="Run your first security regression sweep to populate the dashboard."
          action={
            <LinkButton href="/policies" variant="primary">
              Go to Policies
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            <StatTile
              label="Security Coverage"
              value={`${summary.securityCoverage}%`}
              accent={summary.securityCoverage >= 95 ? "success" : summary.securityCoverage >= 85 ? "warning" : "danger"}
              icon={<ShieldCheck size={16} />}
              sublabel="of known attacks blocked"
            />
            <StatTile
              label="Attack Detection"
              value={`${summary.attackDetection.blocked} / ${summary.attackDetection.total}`}
              icon={<Crosshair size={16} />}
              sublabel="attacks correctly blocked"
            />
            <StatTile
              label="False Positive Rate"
              value={`${summary.falsePositiveRate}%`}
              accent={summary.falsePositiveRate > 5 ? "danger" : summary.falsePositiveRate > 2 ? "warning" : "success"}
              icon={<TriangleAlert size={16} />}
              sublabel="legit requests blocked"
            />
            <StatTile
              label="Security Regressions"
              value={String(summary.securityRegressions)}
              accent={summary.securityRegressions > 0 ? "danger" : "success"}
              icon={<GitCompareArrows size={16} />}
              sublabel="version comparisons flagged"
            />
            <StatTile
              label="Critical Bypasses"
              value={String(summary.criticalBypasses)}
              accent={summary.criticalBypasses > 0 ? "danger" : "success"}
              icon={<TriangleAlert size={16} />}
              sublabel="latest run, high/critical"
            />
            <StatTile label="Test Cases" value={summary.testCases.toLocaleString()} icon={<FlaskConical size={16} />} sublabel="in latest run" />
            <StatTile label="Policy Version" value={summary.policyVersion} icon={<Tag size={16} />} sublabel="currently evaluated" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Security Coverage Over Time</CardTitle>
                  <CardDescription>Percentage of known attacks blocked, by policy version.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <CoverageTrendChart data={summary.coverageTrend} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>False Positive Rate</CardTitle>
                  <CardDescription>Legitimate requests incorrectly blocked, by policy version.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <FalsePositiveChart data={summary.falsePositiveTrend} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Coverage by Attack Category</CardTitle>
                  <CardDescription>Latest run — where policy enforcement is strong vs. weak.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <CategoryBarChart data={summary.categoryPerformance} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>New Bypasses per Version</CardTitle>
                  <CardDescription>Previously-blocked attacks that started passing.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <RegressionTrendChart data={summary.regressionTrend} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Test Runs</CardTitle>
                <CardDescription>Latest security regression sweeps across all policies.</CardDescription>
              </div>
              <Link href="/runs" className="text-xs font-medium text-accent hover:underline">
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Run ID</TH>
                    <TH>Policy</TH>
                    <TH>Tests</TH>
                    <TH>Passed</TH>
                    <TH>Failed</TH>
                    <TH>Coverage</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {summary.recentRuns.map((run) => (
                    <TR key={run.id}>
                      <TD className="mono text-xs">
                        <Link href={`/runs/${run.id}`} className="text-accent hover:underline">
                          {run.id}
                        </Link>
                      </TD>
                      <TD>
                        {run.policyName} <Badge tone="neutral">{run.policyVersionLabel}</Badge>
                      </TD>
                      <TD>{run.stats.totalTests}</TD>
                      <TD className="text-success">{run.stats.passed}</TD>
                      <TD className="text-danger">{run.stats.failed}</TD>
                      <TD>
                        <Badge tone={actionTone(run.stats.securityCoverage >= 95 ? "ALLOW" : run.stats.securityCoverage >= 85 ? "REVIEW" : "BLOCK")}>
                          {run.stats.securityCoverage}%
                        </Badge>
                      </TD>
                      <TD className="text-muted">{formatDate(run.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
