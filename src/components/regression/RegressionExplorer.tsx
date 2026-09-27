"use client";

import { useEffect, useState } from "react";
import { Loader2, TriangleAlert, ShieldCheck } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Badge, severityTone } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { CategoryComparisonChart } from "@/components/charts/CategoryComparisonChart";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { truncate } from "@/lib/utils";
import { categoryLabel } from "@/lib/categories";
import type { Regression, TestRun } from "@/lib/types";

export function RegressionExplorer({
  runs,
  initialBaselineId,
  initialCurrentId,
}: {
  runs: TestRun[];
  initialBaselineId?: string;
  initialCurrentId?: string;
}) {
  const sorted = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [baselineId, setBaselineId] = useState(initialBaselineId ?? sorted[1]?.id ?? sorted[0]?.id ?? "");
  const [currentId, setCurrentId] = useState(initialCurrentId ?? sorted[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [regression, setRegression] = useState<Regression | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baselineId || !currentId) return;
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        await fetchRegression();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function fetchRegression() {
      try {
        const res = await fetch("/api/regression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baselineRunId: baselineId, currentRunId: currentId }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to compute regression");
        if (!cancelled) setRegression(data.regression);
      } catch (err) {
        if (!cancelled && err instanceof Error && err.name !== "AbortError") setError(err.message);
      }
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [baselineId, currentId]);

  if (runs.length < 2) {
    return <EmptyState title="Need at least two runs" description="Run the security test suite against two policy versions to compare regressions." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Baseline (previous)
          <Select value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
            {sorted.map((r) => (
              <option key={r.id} value={r.id}>
                {r.policyName} — {r.policyVersionLabel} ({r.id})
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Current
          <Select value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
            {sorted.map((r) => (
              <option key={r.id} value={r.id}>
                {r.policyName} — {r.policyVersionLabel} ({r.id})
              </option>
            ))}
          </Select>
        </label>
        {loading && <Loader2 size={16} className="animate-spin text-accent" />}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {regression && (
        <>
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              regression.isRegression ? "border-danger/40 bg-danger/5" : "border-success/40 bg-success/5"
            }`}
          >
            {regression.isRegression ? <TriangleAlert size={18} className="text-danger" /> : <ShieldCheck size={18} className="text-success" />}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {regression.isRegression ? "SECURITY REGRESSION DETECTED" : "No regression detected"}
              </p>
              <p className="text-xs text-muted">
                {regression.baselineLabel} → {regression.currentLabel}: coverage {regression.previousCoverage}% → {regression.currentCoverage}% (
                <span className={regression.changePoints < 0 ? "text-danger" : "text-success"}>
                  {regression.changePoints >= 0 ? "+" : ""}
                  {regression.changePoints} pts
                </span>
                ), {regression.newBypassCount} new bypass{regression.newBypassCount === 1 ? "" : "es"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Previous Coverage" value={`${regression.previousCoverage}%`} />
            <StatTile label="Current Coverage" value={`${regression.currentCoverage}%`} accent={regression.changePoints < 0 ? "danger" : "success"} />
            <StatTile
              label="Change"
              value={`${regression.changePoints >= 0 ? "+" : ""}${regression.changePoints} pts`}
              accent={regression.changePoints < 0 ? "danger" : "success"}
            />
            <StatTile label="New Bypasses" value={String(regression.newBypassCount)} accent={regression.newBypassCount > 0 ? "danger" : "success"} />
          </div>

          {regression.categoryComparison.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Category-Level Performance</h3>
              <CategoryComparisonChart data={regression.categoryComparison} baselineLabel={regression.baselineLabel} currentLabel={regression.currentLabel} />
            </div>
          )}

          {regression.newBypasses.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Previously Blocked — Now Passing</h3>
              <Table>
                <THead>
                  <TR>
                    <TH>Category</TH>
                    <TH>Mutation</TH>
                    <TH>Prompt</TH>
                    <TH>Severity</TH>
                    <TH>Previous</TH>
                    <TH>Current</TH>
                  </TR>
                </THead>
                <TBody>
                  {regression.newBypasses.slice(0, 50).map((b) => (
                    <TR key={b.testCaseId}>
                      <TD className="text-xs">{categoryLabel(b.attackCategory)}</TD>
                      <TD className="text-xs text-muted">{b.mutationType ?? "—"}</TD>
                      <TD className="max-w-md text-xs text-muted">{truncate(b.prompt, 70)}</TD>
                      <TD>
                        <Badge tone={severityTone(b.severity)}>{b.severity}</Badge>
                      </TD>
                      <TD className="text-success">{b.previousAction}</TD>
                      <TD className="text-danger">{b.currentAction}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {regression.newBypasses.length > 50 && (
                <p className="mt-2 text-xs text-muted-2">Showing 50 of {regression.newBypasses.length} bypasses.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
