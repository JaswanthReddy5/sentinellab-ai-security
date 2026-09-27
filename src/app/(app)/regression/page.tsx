import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { RegressionExplorer } from "@/components/regression/RegressionExplorer";

export const dynamic = "force-dynamic";

export default async function RegressionPage({
  searchParams,
}: {
  searchParams: Promise<{ baseline?: string; current?: string; policyId?: string }>;
}) {
  const { baseline, current, policyId } = await searchParams;
  const store = getStore();
  const allRuns = await store.listRuns();
  const runs = policyId ? allRuns.filter((r) => r.policyId === policyId) : allRuns;

  return (
    <>
      <PageHeader
        title="Regression Comparison"
        description="Compare two policy versions against the same test suite to catch security regressions before they ship."
      />
      <Card>
        <CardContent>
          <RegressionExplorer runs={runs} initialBaselineId={baseline} initialCurrentId={current} />
        </CardContent>
      </Card>
    </>
  );
}
