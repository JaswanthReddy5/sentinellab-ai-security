"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { RunResultsExplorer } from "@/components/runs/RunResultsExplorer";
import { ATTACK_CATEGORIES } from "@/lib/categories";
import type { AttackCategoryKey, Policy, TestResult, TestRun } from "@/lib/types";

const PROGRESS_STEPS = [
  "Generating tests...",
  "Evaluating policies...",
  "Comparing expected vs actual...",
  "Detecting regressions...",
  "Generating report...",
];

export function RunLauncher({ policies, presetPolicyId, presetVersionId }: { policies: Policy[]; presetPolicyId?: string; presetVersionId?: string }) {
  const router = useRouter();
  const [policyId, setPolicyId] = useState(presetPolicyId ?? policies[0]?.id ?? "");
  const policy = useMemo(() => policies.find((p) => p.id === policyId), [policies, policyId]);
  const [versionId, setVersionId] = useState(presetVersionId ?? policy?.versions.find((v) => v.isActive)?.id ?? policy?.versions[0]?.id ?? "");

  const activeVersionId = versionId || policy?.versions.find((v) => v.isActive)?.id || policy?.versions[0]?.id || "";

  const [testCount, setTestCount] = useState(200);
  const [mutationLevel, setMutationLevel] = useState<"low" | "medium" | "high">("medium");
  const [includeBenign, setIncludeBenign] = useState(true);
  const [categories, setCategories] = useState<AttackCategoryKey[]>([]);

  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<{ run: TestRun; results: TestResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(cat: AttackCategoryKey) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleRun() {
    if (!policy || !activeVersionId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setStepIndex(0);

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, 500);

    try {
      const res = await fetch(`/api/policies/${policy.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyVersionId: activeVersionId, testCount, categories, mutationLevel, includeBenign }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run security test");
      setStepIndex(PROGRESS_STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setResult({ run: data.run, results: data.results });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(stepTimer);
      setRunning(false);
    }
  }

  if (policies.length === 0) {
    return <p className="text-sm text-muted">Create a policy first before running a security test.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Policy
          <Select
            value={policyId}
            onChange={(e) => {
              setPolicyId(e.target.value);
              const p = policies.find((pp) => pp.id === e.target.value);
              setVersionId(p?.versions.find((v) => v.isActive)?.id ?? p?.versions[0]?.id ?? "");
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
                {v.label} {v.isActive ? "(active)" : ""}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Number of tests
          <input
            type="number"
            min={10}
            max={2000}
            step={10}
            value={testCount}
            onChange={(e) => setTestCount(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Attack mutation level
          <Select value={mutationLevel} onChange={(e) => setMutationLevel(e.target.value as "low" | "medium" | "high")}>
            <option value="low">Low — direct variants only</option>
            <option value="medium">Medium — moderate obfuscation</option>
            <option value="high">High — full mutation suite</option>
          </Select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-2">Attack categories (leave empty for all)</span>
        <div className="flex flex-wrap gap-1.5">
          {ATTACK_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.key}
              onClick={() => toggleCategory(c.key)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                categories.includes(c.key) ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={includeBenign} onChange={(e) => setIncludeBenign(e.target.checked)} className="accent-cyan-400" />
        Include benign suite (measures false-positive rate)
      </label>

      <Button onClick={handleRun} disabled={running || !activeVersionId}>
        {running ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
        {running ? "Running..." : "Run Security Test"}
      </Button>

      {running && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border-soft bg-surface-2/50 p-3">
          {PROGRESS_STEPS.map((step, i) => (
            <div key={step} className={`flex items-center gap-2 text-xs ${i <= stepIndex ? "text-foreground" : "text-muted-2"}`}>
              {i < stepIndex ? <CheckCircle2 size={12} className="text-success" /> : i === stepIndex ? <Loader2 size={12} className="animate-spin text-accent" /> : <span className="h-3 w-3" />}
              {step}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-sm font-medium text-foreground">Run complete — {result.run.id}</span>
            <Badge tone="accent">{result.run.stats.securityCoverage}% coverage</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Security Coverage" value={`${result.run.stats.securityCoverage}%`} />
            <StatTile label="False Positive Rate" value={`${result.run.stats.falsePositiveRate}%`} />
            <StatTile label="Critical Bypasses" value={String(result.run.stats.criticalBypasses)} accent={result.run.stats.criticalBypasses > 0 ? "danger" : "success"} />
            <StatTile label="Total Tests" value={String(result.run.stats.totalTests)} />
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-2">Results</span>
            <RunResultsExplorer results={result.results} />
          </div>

          <p className="text-[11px] text-muted-2">
            Full result data is shown above immediately since demo mode (in-memory store) does not guarantee this run is visible from other
            pages on a serverless deployment — configure <span className="mono">DATABASE_URL</span> for full cross-page persistence.
          </p>
          <a href={`/runs/${result.run.id}`} className="text-xs font-medium text-accent hover:underline">
            Try opening the dedicated run page →
          </a>
        </div>
      )}
    </div>
  );
}
