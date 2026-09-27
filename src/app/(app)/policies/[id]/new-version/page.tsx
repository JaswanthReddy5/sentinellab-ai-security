import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { PolicyEditor } from "@/components/policies/PolicyEditor";

export const dynamic = "force-dynamic";

export default async function NewPolicyVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const policy = await store.getPolicy(id);
  if (!policy) notFound();

  return (
    <>
      <PageHeader title={`New Version — ${policy.name}`} description="Publish a new version of this policy. It will be evaluated against the same test suite for regression comparison." />
      <PolicyEditor mode="yaml" policyId={policy.id} />
    </>
  );
}
