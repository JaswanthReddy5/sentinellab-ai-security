"use client";

import { useMemo, useState } from "react";
import { Loader2, Swords, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge, actionTone } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { StatTile } from "@/components/ui/StatTile";
import { BypassInvestigationCard } from "@/components/investigation/BypassInvestigationCard";
import { ATTACK_CATEGORIES, categoryLabel } from "@/lib/categories";
import { buildEvaluationChecklist } from "@/lib/engine/checklist";
import { getCategoryRecommendation } from "@/lib/engine/recommend";
import { truncate } from "@/lib/utils";
import type { AttackCategoryKey, Policy } from "@/lib/types";
import type { AttackLabSweepResult, AttackLabVariant } from "@/lib/engine/runner";

export function AttackCategorySweep({ policies }: { policies: Policy[] }) {
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const policy = useMemo(() => policies.find((p) => p.id === policyId), [policies, policyId]);
  const [versionId, setVersionId] = useState(policy?.versions.find((v) => v.isActive)?.id ?? "");
  const activeVersionId = versionId || policy?.versions.find((v) => v.isActive)?.id || policy?.versions[0]?.id || "";
  const activeVersion = policy?.versions.find((v) => v.id === activeVersionId);

  const [category, setCategory] = useState<AttackCategoryKey | "all">("all");
  const [mutationLevel, setMutationLevel] = useState<"low" | "medium" | "high">("high");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttackLabSweepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "BLOCK" | "REVIEW" | "ALLOW">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleRun() {
    if (!activeVersionId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/attack-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyVersionId: activeVersionId, category: category === "all" ? null : category, mutationLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run attack sweep");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const filteredVariants = result?.variants.filter((v) => filter === "all" || v.actualAction === filter) ?? [];

  if (policies.length === 0) {
    return <p className="text-sm text-muted">Create a policy first to run an attack sweep against it.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Policy
          <Select
            value={policyId}
            onChange={(e) => {
              setPolicyId(e.target.value);
              const p = policies.find((pp) => pp.id === e.target.value);
              setVersionId(p?.versions.find((v) => v.isActive)?.id ?? "");
            }}
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Version
          <Select value={activeVersionId} onChange={(e) => setVersionId(e.target.value)}>
            {policy?.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Attack category
          <Select value={category} onChange={(e) => setCategory(e.target.value as AttackCategoryKey | "all")}>
            <option value="all">All categories</option>
            {ATTACK_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Mutation level
          <Select value={mutationLevel} onChange={(e) => setMutationLevel(e.target.value as "low" | "medium" | "high")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High — full mutation suite</option>
          </Select>
        </label>
        <Button onClick={handleRun} disabled={loading || !activeVersionId}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
          Generate &amp; Evaluate
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Generated Variants" value={String(result.stats.generated)} />
            <StatTile label="Blocked" value={String(result.stats.blocked)} accent="success" />
            <StatTile label="Review" value={String(result.stats.review)} accent="warning" />
            <StatTile label="Bypassed" value={String(result.stats.bypassed)} accent={result.stats.bypassed > 0 ? "danger" : "success"} />
          </div>

          <div className="flex gap-1.5">
            {(["all", "BLOCK", "REVIEW", "ALLOW"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === f ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "ALLOW" ? "Bypassed" : f}
              </button>
            ))}
          </div>

          <Table>
            <THead>
              <TR>
                <TH className="w-6" />
                <TH>Category</TH>
                <TH>Mutation</TH>
                <TH>Test Prompt</TH>
                <TH>Result</TH>
                <TH>Severity</TH>
              </TR>
            </THead>
            <TBody>
              {filteredVariants.map((v) => (
                <VariantRow
                  key={v.attackId}
                  variant={v}
                  isOpen={expanded === v.attackId}
                  onToggle={() => setExpanded(expanded === v.attackId ? null : v.attackId)}
                  policyDocument={activeVersion?.document}
                />
              ))}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}

function VariantRow({
  variant,
  isOpen,
  onToggle,
  policyDocument,
}: {
  variant: AttackLabVariant;
  isOpen: boolean;
  onToggle: () => void;
  policyDocument?: Policy["versions"][number]["document"];
}) {
  const isBypass = variant.verdict === "CRITICAL_BYPASS";
  const checklist = policyDocument ? buildEvaluationChecklist(policyDocument, variant.category) : [];
  const recommendation = policyDocument ? getCategoryRecommendation(variant.category, policyDocument.policy.name) : null;

  return (
    <>
      <TR className="cursor-pointer" onClick={onToggle}>
        <TD>{isOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}</TD>
        <TD className="text-xs text-muted">{categoryLabel(variant.category)}</TD>
        <TD className="text-xs text-muted">{variant.mutationType}</TD>
        <TD className="max-w-md text-xs text-muted">{truncate(variant.testPrompt, 70)}</TD>
        <TD>
          <Badge tone={actionTone(variant.actualAction)}>{variant.actualAction === "ALLOW" ? "BYPASSED" : variant.actualAction}</Badge>
        </TD>
        <TD className="capitalize text-xs text-muted">{variant.severity}</TD>
      </TR>
      {isOpen && (
        <TR>
          <TD colSpan={6} className="bg-surface-2/40">
            <div className="p-3">
              <BypassInvestigationCard
                categoryLabel={categoryLabel(variant.category)}
                severity={variant.severity}
                mutationType={variant.mutationType}
                prompt={variant.testPrompt}
                expectedAction={variant.expectedAction}
                currentAction={variant.actualAction}
                checklist={checklist}
                rootCause={
                  isBypass
                    ? (recommendation?.problem ?? "This variant evaded every configured detector for the current policy.")
                    : "This variant was correctly handled by the current policy."
                }
                recommendation={isBypass ? recommendation : null}
              />
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}
