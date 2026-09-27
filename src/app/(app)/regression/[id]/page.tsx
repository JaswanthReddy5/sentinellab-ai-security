import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, severityTone } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { categoryLabel } from "@/lib/categories";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegressionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const regression = await store.getRegression(id);
  if (!regression) notFound();

  return (
    <>
      <PageHeader
        title="Security Regression Report"
        description={`${regression.baselineLabel} → ${regression.currentLabel}`}
      />

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
                  <TR key={c.category}>
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

      {regression.newBypasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previously Blocked — Now Passing</CardTitle>
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
