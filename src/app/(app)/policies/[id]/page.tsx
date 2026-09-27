import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { LinkButton } from "@/components/ui/Button";
import { RunLauncher } from "@/components/runs/RunLauncher";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const policy = await store.getPolicy(id);
  if (!policy) notFound();

  const allPolicies = await store.listPolicies();
  const activeVersion = policy.versions.find((v) => v.isActive) ?? policy.versions[policy.versions.length - 1];
  const sortedVersions = [...policy.versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        title={policy.name}
        description={policy.description || "No description provided."}
        actions={
          <LinkButton href={`/policies/${policy.id}/new-version`} variant="secondary">
            <Plus size={14} /> New Version
          </LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active Version — {activeVersion?.label}</CardTitle>
                <CardDescription>Evaluated by the deterministic rule-based engine.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>{activeVersion && <CodeBlock code={activeVersion.raw} language={activeVersion.format} />}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {sortedVersions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface-2/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="mono text-sm text-foreground">{v.label}</span>
                    {v.isActive && <Badge tone="accent">active</Badge>}
                  </div>
                  <span className="text-xs text-muted">{formatDate(v.createdAt)}</span>
                </div>
              ))}
              {sortedVersions.length > 1 && (
                <Link href={`/regression?policyId=${policy.id}`} className="mt-1 text-xs font-medium text-accent hover:underline">
                  Compare versions →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run Security Test</CardTitle>
          </CardHeader>
          <CardContent>
            <RunLauncher policies={allPolicies} presetPolicyId={policy.id} presetVersionId={activeVersion?.id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
