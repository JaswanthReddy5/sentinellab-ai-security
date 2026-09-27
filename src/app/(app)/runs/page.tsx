import Link from "next/link";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { RunLauncher } from "@/components/runs/RunLauncher";
import { formatDateTime } from "@/lib/utils";
import { History } from "lucide-react";

export default async function RunsPage() {
  const store = getStore();
  const [runs, policies] = await Promise.all([store.listRuns(), store.listPolicies()]);

  return (
    <>
      <PageHeader title="Test Runs" description="Launch a new security regression sweep, or review history of past runs." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Launch New Run</CardTitle>
          </CardHeader>
          <CardContent>
            <RunLauncher policies={policies} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Run History</CardTitle>
              <CardDescription>{runs.length} run{runs.length === 1 ? "" : "s"} recorded</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<History size={24} />} title="No runs yet" description="Launch your first run using the panel on the left." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Run ID</TH>
                    <TH>Policy</TH>
                    <TH>Tests</TH>
                    <TH>Passed</TH>
                    <TH>Failed</TH>
                    <TH>Regression</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {runs.map((run) => (
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
                        {run.stats.criticalBypasses > 0 ? (
                          <Badge tone="critical">{run.stats.criticalBypasses} bypass{run.stats.criticalBypasses === 1 ? "" : "es"}</Badge>
                        ) : (
                          <Badge tone="success">none</Badge>
                        )}
                      </TD>
                      <TD className="text-xs text-muted">{formatDateTime(run.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
