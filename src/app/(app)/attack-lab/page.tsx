import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { AttackLabPanel } from "@/components/attacklab/AttackLabPanel";
import { ATTACK_CATEGORIES } from "@/lib/categories";
import { MUTATION_TYPES } from "@/lib/categories";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export default async function AttackLabPage() {
  const store = getStore();
  const policies = await store.listPolicies();

  return (
    <>
      <PageHeader
        title="Attack Mutation Lab"
        description="Explore how seed attacks are transformed into adversarial variants, and test them live against a policy — entirely offline, no LLM required."
      />

      <Card>
        <CardHeader>
          <CardTitle>Live Mutation Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <AttackLabPanel policies={policies} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attack Categories</CardTitle>
              <CardDescription>12 categories tracked across every test run.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH>Description</TH>
                </TR>
              </THead>
              <TBody>
                {ATTACK_CATEGORIES.map((c) => (
                  <TR key={c.key}>
                    <TD className="whitespace-nowrap font-medium">{c.label}</TD>
                    <TD className="text-xs text-muted">{c.description}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Mutation Techniques</CardTitle>
              <CardDescription>Deterministic transformations applied to seed attacks.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Technique</TH>
                </TR>
              </THead>
              <TBody>
                {MUTATION_TYPES.map((m) => (
                  <TR key={m.key}>
                    <TD className="font-medium">{m.label}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
