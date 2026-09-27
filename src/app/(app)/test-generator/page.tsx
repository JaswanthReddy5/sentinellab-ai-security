import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TestGeneratorPanel } from "@/components/testgen/TestGeneratorPanel";

export default async function TestGeneratorPage() {
  const store = getStore();
  const policies = await store.listPolicies();

  return (
    <>
      <PageHeader
        title="Automatic Test Generation"
        description="Generate positive, negative, and boundary test cases directly from a policy's rules — no manual test writing required."
      />
      <Card>
        <CardContent>
          <TestGeneratorPanel policies={policies} />
        </CardContent>
      </Card>
    </>
  );
}
