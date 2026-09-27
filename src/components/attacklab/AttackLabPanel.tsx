"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge, actionTone, severityTone } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ATTACK_SEEDS } from "@/lib/engine/seeds";
import { MUTATIONS, mutateSeed } from "@/lib/engine/mutate";
import { categoryLabel } from "@/lib/categories";
import type { EvaluationOutcome, Policy } from "@/lib/types";

export function AttackLabPanel({ policies }: { policies: Policy[] }) {
  const [seedId, setSeedId] = useState(ATTACK_SEEDS[0].id);
  const [mutationType, setMutationType] = useState(MUTATIONS[0].type);
  const seed = ATTACK_SEEDS.find((s) => s.id === seedId)!;
  const mutation = MUTATIONS.find((m) => m.type === mutationType)!;

  const mutated = useMemo(() => mutateSeed(seed, mutation), [seed, mutation]);

  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const policy = useMemo(() => policies.find((p) => p.id === policyId), [policies, policyId]);
  const [versionId, setVersionId] = useState(policy?.versions.find((v) => v.isActive)?.id ?? "");
  const activeVersionId = versionId || policy?.versions.find((v) => v.isActive)?.id || policy?.versions[0]?.id || "";

  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<EvaluationOutcome | null>(null);

  async function handleEvaluate() {
    if (!activeVersionId) return;
    setLoading(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyVersionId: activeVersionId, prompt: mutated.testPrompt }),
      });
      const data = await res.json();
      if (res.ok) setOutcome(data.outcome);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Seed attack
            <Select value={seedId} onChange={(e) => setSeedId(e.target.value)}>
              {ATTACK_SEEDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {categoryLabel(s.category)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Mutation type
            <Select value={mutationType} onChange={(e) => setMutationType(e.target.value as typeof mutationType)}>
              {MUTATIONS.map((m) => (
                <option key={m.type} value={m.type}>
                  {m.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone={severityTone(seed.severity)}>{seed.severity}</Badge>
          <Badge tone="neutral">{categoryLabel(seed.category)}</Badge>
          <Badge tone="accent">{mutation.label}</Badge>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-2">Original seed</span>
          <p className="rounded-lg border border-border-soft bg-surface-2/40 p-3 text-xs text-muted">{seed.text}</p>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-2">Mutated test prompt</span>
          <CodeBlock code={mutated.testPrompt} language="text" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
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
        </div>
        <Button onClick={handleEvaluate} disabled={loading || !activeVersionId}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldQuestion size={14} />}
          Evaluate Against Policy
        </Button>

        {outcome && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/60 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-2">Result:</span>
              <Badge tone={actionTone(outcome.action)}>{outcome.action}</Badge>
              <Badge tone={severityTone(outcome.severity)}>{outcome.severity}</Badge>
              <Badge tone="neutral">confidence {(outcome.confidence * 100).toFixed(0)}%</Badge>
            </div>
            <p className="text-xs text-muted">{outcome.reason}</p>
            {outcome.matchedRules.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-2">Matched rules: </span>
                <span className="mono text-foreground">{outcome.matchedRules.join(", ")}</span>
              </div>
            )}
            {outcome.missingDetections.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-2">Missing detection coverage: </span>
                <span className="mono text-warning">{outcome.missingDetections.join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
