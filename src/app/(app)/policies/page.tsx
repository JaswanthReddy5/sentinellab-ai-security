import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default async function PoliciesPage() {
  const store = getStore();
  const policies = await store.listPolicies();

  return (
    <>
      <PageHeader
        title="Policies"
        description="Define AI security policies as rules over detection categories and tool restrictions. Compare versions to catch regressions before they ship."
        actions={
          <LinkButton href="/policies/new" variant="primary">
            <Plus size={14} /> New Policy
          </LinkButton>
        }
      />

      {policies.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title="No policies yet"
          description="Create your first policy using the form editor or paste in YAML/JSON."
          action={
            <LinkButton href="/policies/new" variant="primary">
              <Plus size={14} /> New Policy
            </LinkButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => {
            const activeVersion = policy.versions.find((v) => v.isActive) ?? policy.versions[policy.versions.length - 1];
            return (
              <Link key={policy.id} href={`/policies/${policy.id}`}>
                <Card className="h-full transition-colors hover:border-accent/40">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-accent" />
                        <span className="font-medium text-foreground">{policy.name}</span>
                      </div>
                      {activeVersion && <Badge tone="accent">{activeVersion.label}</Badge>}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted">{policy.description || "No description provided."}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-2">
                      <span>{policy.versions.length} version{policy.versions.length === 1 ? "" : "s"}</span>
                      <span>Updated {formatDate(policy.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
