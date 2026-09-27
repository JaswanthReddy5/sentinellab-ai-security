"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge, actionTone, verdictTone } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { categoryLabel } from "@/lib/categories";
import { truncate } from "@/lib/utils";
import type { Policy } from "@/lib/types";

interface GeneratedRow {
  id: string;
  category: string;
  attackCategory: string | null;
  prompt: string;
  expectedAction: "ALLOW" | "BLOCK" | "REVIEW";
  actualAction: "ALLOW" | "BLOCK" | "REVIEW";
  verdict: string;
  reason: string;
  severity: string;
  confidence: number;
}

export function TestGeneratorPanel({ policies }: { policies: Policy[] }) {
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const policy = useMemo(() => policies.find((p) => p.id === policyId), [policies, policyId]);
  const [versionId, setVersionId] = useState(policy?.versions.find((v) => v.isActive)?.id ?? policy?.versions[0]?.id ?? "");
  const activeVersionId = versionId || policy?.versions.find((v) => v.isActive)?.id || policy?.versions[0]?.id || "";
  const [count, setCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GeneratedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "boundary">("all");

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyVersionId: activeVersionId, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate tests");
      setRows(data.tests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = rows?.filter((r) => filter === "all" || r.category === filter) ?? null;

  if (policies.length === 0) {
    return <EmptyState title="No policies available" description="Create a policy first to generate tests from it." />;
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
                {v.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Count
          <input
            type="number"
            min={5}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
        </label>
        <Button onClick={handleGenerate} disabled={loading || !activeVersionId}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Generate Tests
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {rows && (
        <>
          <div className="flex gap-1.5">
            {(["all", "positive", "negative", "boundary"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${
                  filter === f ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH>Attack Type</TH>
                <TH>Prompt</TH>
                <TH>Expected</TH>
                <TH>Actual</TH>
                <TH>Verdict</TH>
                <TH>Severity</TH>
              </TR>
            </THead>
            <TBody>
              {filteredRows?.map((row) => (
                <TR key={row.id}>
                  <TD className="capitalize">{row.category}</TD>
                  <TD className="text-xs text-muted">{categoryLabel(row.attackCategory as never)}</TD>
                  <TD className="max-w-md text-xs text-muted" title={row.prompt}>
                    {truncate(row.prompt, 90)}
                  </TD>
                  <TD>
                    <Badge tone={actionTone(row.expectedAction)}>{row.expectedAction}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={actionTone(row.actualAction)}>{row.actualAction}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={verdictTone(row.verdict)}>{row.verdict.replace(/_/g, " ")}</Badge>
                  </TD>
                  <TD className="capitalize text-xs text-muted">{row.severity}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}
