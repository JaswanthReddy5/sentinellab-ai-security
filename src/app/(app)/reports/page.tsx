import Link from "next/link";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { FileText } from "lucide-react";

export default async function ReportsPage() {
  const store = getStore();
  const runs = await store.listRuns();

  return (
    <>
      <PageHeader title="Reports" description="Generate an executive security regression report for any test run." />
      <Card>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<FileText size={24} />} title="No runs yet" description="Run a security test to generate a report." />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Run ID</TH>
                  <TH>Policy</TH>
                  <TH>Coverage</TH>
                  <TH>Date</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {runs.map((run) => (
                  <TR key={run.id}>
                    <TD className="mono text-xs">{run.id}</TD>
                    <TD>
                      {run.policyName} <Badge tone="neutral">{run.policyVersionLabel}</Badge>
                    </TD>
                    <TD>{run.stats.securityCoverage}%</TD>
                    <TD className="text-xs text-muted">{formatDateTime(run.createdAt)}</TD>
                    <TD>
                      <Link href={`/reports/${run.id}`} className="text-xs font-medium text-accent hover:underline">
                        View report →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
