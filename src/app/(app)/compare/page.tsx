import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { CompareExplorer } from "@/components/compare/CompareExplorer";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ baseline?: string; current?: string }>;
}) {
  const { baseline, current } = await searchParams;
  const store = getStore();
  const policies = await store.listPolicies();

  return (
    <>
      <PageHeader
        title="Policy Comparison"
        description="Select two policy versions to see exactly what changed and the measured security effect — computed live from the deterministic test engine, not hard-coded."
      />
      <Card>
        <CardContent>
          <CompareExplorer policies={policies} initialBaseline={baseline} initialCurrent={current} />
        </CardContent>
      </Card>
    </>
  );
}
