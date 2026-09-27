import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { AttackLabPanel } from "@/components/attacklab/AttackLabPanel";
import { AttackCategorySweep } from "@/components/attacklab/AttackCategorySweep";
import { ATTACK_CATEGORIES, MUTATION_TYPES } from "@/lib/categories";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export const dynamic = "force-dynamic";

const FLOW_STEPS = ["Seed Attack", "Mutation Engine", "Attack Variants", "Policy Evaluation", "Bypass Discovery"];

export default async function AttackLabPage() {
  const store = getStore();
  const policies = await store.listPolicies();

  return (
    <>
      <PageHeader
        title="Attack Evolution Lab"
        description="Mutate known attack patterns to discover security regressions — entirely offline, no LLM required."
      />

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-soft bg-surface-2/40 px-4 py-2.5 text-xs text-muted">
        {FLOW_STEPS.map((step, i) => (
          <span key={step} className="flex items-center gap-1.5">
            <span className={i === FLOW_STEPS.length - 1 ? "font-medium text-danger" : "font-medium text-foreground"}>{step}</span>
            {i < FLOW_STEPS.length - 1 && <ArrowRight size={12} className="text-muted-2" />}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Generate &amp; Evaluate a Category</CardTitle>
            <CardDescription>Every seed × mutation combination for a category, evaluated live against a real policy.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AttackCategorySweep policies={policies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Single Mutation Preview</CardTitle>
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
              <CardDescription>
                12 categories tracked across every test run.{" "}
                <Link href="/attack-research" className="text-accent hover:underline">
                  Read the security research →
                </Link>
              </CardDescription>
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
