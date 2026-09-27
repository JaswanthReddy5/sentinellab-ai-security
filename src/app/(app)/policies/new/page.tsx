import { PageHeader } from "@/components/ui/PageHeader";
import { PolicyEditor } from "@/components/policies/PolicyEditor";

export default function NewPolicyPage() {
  return (
    <>
      <PageHeader title="New Policy" description="Build a policy visually or paste YAML/JSON directly. Validation runs live as you type." />
      <PolicyEditor />
    </>
  );
}
