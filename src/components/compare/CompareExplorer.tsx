"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TriangleAlert, ShieldCheck, Plus, Minus, Pencil } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { CategoryComparisonChart } from "@/components/charts/CategoryComparisonChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlowDiagram, type FlowStep } from "@/components/ui/FlowDiagram";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { BypassInvestigationCard } from "@/components/investigation/BypassInvestigationCard";
import { categoryLabel } from "@/lib/categories";
import { truncate } from "@/lib/utils";
import { pickTopBypass } from "@/lib/engine/regression";
import { buildEvaluationChecklist } from "@/lib/engine/checklist";
import { getCategoryRecommendation } from "@/lib/engine/recommend";
import type { Policy, Regression, TestRun } from "@/lib/types";
import type { PolicyDiff, RuleImpact } from "@/lib/engine/policyDiff";

interface VersionOption {
  id: string;
  policyName: string;
  label: string;
}

interface CompareResponse {
  regression: Regression;
  diff: PolicyDiff;
  ruleImpact: RuleImpact[];
  baselineRun: TestRun;
  currentRun: TestRun;
  baselineCategoryBreakdown: Array<{ category: string; total: number; blocked: number; coverage: number }>;
  currentCategoryBreakdown: Array<{ category: string; total: number; blocked: number; coverage: number }>;
}

export function CompareExplorer({ policies, initialBaseline, initialCurrent }: { policies: Policy[]; initialBaseline?: string; initialCurrent?: string }) {
  const versions: VersionOption[] = useMemo(
    () =>
      policies.flatMap((p) =>
        [...p.versions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((v) => ({ id: v.id, policyName: p.name, label: v.label }))
      ),
    [policies]
  );

  const [baselineId, setBaselineId] = useState(initialBaseline ?? versions[0]?.id ?? "");
  const [currentId, setCurrentId] = useState(initialCurrent ?? versions[versions.length - 1]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baselineId || !currentId) return;
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/policies/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baselineVersionId: baselineId, currentVersionId: currentId }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to compare policy versions");
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled && err instanceof Error && err.name !== "AbortError") setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [baselineId, currentId]);

  const currentVersionDoc = useMemo(
    () => policies.flatMap((p) => p.versions).find((v) => v.id === currentId)?.document ?? null,
    [policies, currentId]
  );

  if (versions.length < 2) {
    return <EmptyState title="Need at least two policy versions" description="Create a second policy version to compare." />;
  }

  const regression = data?.regression;
  const worstCategory = regression ? [...regression.categoryComparison].sort((a, b) => a.delta - b.delta)[0] ?? null : null;
  const topBypass = regression ? pickTopBypass(regression) : null;

  const flowSteps: FlowStep[] = [];
  if (data && regression) {
    flowSteps.push(
      { label: "Policy", value: data.currentRun.policyVersionLabel },
      { label: "Changed From", value: data.baselineRun.policyVersionLabel },
      { label: "Ran", value: `${data.currentRun.stats.totalTests} Tests` },
      { label: "Compared With", value: data.baselineRun.policyVersionLabel },
      {
        label: regression.isRegression ? "🚨 Regression" : "✅ No Regression",
        value: `${regression.previousCoverage}% → ${regression.currentCoverage}%`,
        tone: regression.isRegression ? "danger" : "success",
      }
    );
    if (regression.isRegression) {
      flowSteps.push({ label: "New Bypasses", value: regression.newBypassCount, tone: "danger" });
      flowSteps.push({ label: "Why?", value: "Rule-level impact below", tone: "warning" });
      if (worstCategory) {
        flowSteps.push({ label: "Worst-Hit Category", value: `${categoryLabel(worstCategory.category)} (${worstCategory.delta}%)`, tone: "warning" });
      }
      if (topBypass) {
        flowSteps.push({ label: "Exact Attack", value: truncate(topBypass.prompt, 70), mono: true });
        flowSteps.push({ label: "Root Cause + Fix", value: "Shown below", tone: "accent" });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Previous policy version
          <Select value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.policyName} — {v.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Current policy version
          <Select value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.policyName} — {v.label}
              </option>
            ))}
          </Select>
        </label>
        {loading && <Loader2 size={16} className="animate-spin text-accent" />}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {regression && data && (
        <>
          <FlowDiagram steps={flowSteps} />

          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              regression.isRegression ? "border-danger/40 bg-danger/5" : "border-success/40 bg-success/5"
            }`}
          >
            {regression.isRegression ? <TriangleAlert size={18} className="text-danger" /> : <ShieldCheck size={18} className="text-success" />}
            <div>
              <p className="text-sm font-semibold text-foreground">{regression.isRegression ? "SECURITY REGRESSION DETECTED" : "No regression detected"}</p>
              <p className="text-xs text-muted">
                Security coverage {regression.previousCoverage}% → {regression.currentCoverage}% (
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
            <StatTile label="New Bypasses" value={String(regression.newBypassCount)} accent={regression.newBypassCount > 0 ? "danger" : "success"} />
            <StatTile label="Categories Changed" value={String(data.diff.summary.length)} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Security Regression Report</h3>
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH>Previous</TH>
                  <TH>Current</TH>
                  <TH>Δ</TH>
                </TR>
              </THead>
              <TBody>
                {regression.categoryComparison.map((c) => (
                  <TR key={c.category} className={worstCategory && c.category === worstCategory.category ? "bg-danger/5" : undefined}>
                    <TD>{categoryLabel(c.category)}</TD>
                    <TD>{c.baseline}%</TD>
                    <TD>{c.current}%</TD>
                    <TD className={c.delta < 0 ? "text-danger" : c.delta > 0 ? "text-success" : "text-muted"}>
                      {c.delta >= 0 ? "+" : ""}
                      {c.delta}%
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {regression.categoryComparison.length > 0 && (
            <CategoryComparisonChart data={regression.categoryComparison} baselineLabel="Previous" currentLabel="Current" />
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Policy Diff</h3>
            {!data.diff.hasChanges ? (
              <p className="text-xs text-muted">No rule or tool-configuration differences between these two versions.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.diff.ruleDiffs
                  .filter((d) => d.kind !== "unchanged")
                  .map((d) => (
                    <DiffLine key={d.detect} kind={d.kind} label={`${d.detect}: ${d.description}`} />
                  ))}
                {data.diff.toolDiffs
                  .filter((d) => d.kind !== "unchanged")
                  .map((d) => (
                    <DiffLine key={d.tool} kind={d.kind} label={`tools.${d.tool}: ${d.description}`} />
                  ))}
              </div>
            )}
          </div>

          {data.ruleImpact.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Why Did Coverage Change?</h3>
              <p className="mb-3 text-xs text-muted">Each changed rule, linked to how many shared test cases it actually touched.</p>
              <Table>
                <THead>
                  <TR>
                    <TH>Rule</TH>
                    <TH>Change</TH>
                    <TH>Affected Tests</TH>
                    <TH>Newly Failing</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.ruleImpact.map((r) => (
                    <TR key={r.detect}>
                      <TD className="mono">{r.detect}</TD>
                      <TD>
                        <Badge tone={r.diffKind === "removed" ? "danger" : r.diffKind === "added" ? "success" : "warning"}>{r.diffKind}</Badge>
                      </TD>
                      <TD>{r.affectedTests}</TD>
                      <TD className={r.newlyFailing > 0 ? "text-danger" : "text-muted"}>{r.newlyFailing}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}

          {topBypass && currentVersionDoc && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Show Exact Attack, Root Cause &amp; Fix</CardTitle>
                  <CardDescription>The single highest-severity bypass driving this regression.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <BypassInvestigationCard
                  categoryLabel={categoryLabel(topBypass.attackCategory)}
                  severity={topBypass.severity}
                  mutationType={topBypass.mutationType}
                  prompt={topBypass.prompt}
                  expectedAction="BLOCK"
                  previousAction={topBypass.previousAction}
                  currentAction={topBypass.currentAction}
                  checklist={buildEvaluationChecklist(currentVersionDoc, topBypass.attackCategory)}
                  rootCause={
                    getCategoryRecommendation(topBypass.attackCategory, currentVersionDoc.policy.name)?.problem ??
                    "The current policy no longer applies a control strong enough to block this test case."
                  }
                  recommendation={getCategoryRecommendation(topBypass.attackCategory, currentVersionDoc.policy.name)}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DiffLine({ kind, label }: { kind: "added" | "removed" | "changed" | "unchanged"; label: string }) {
  const Icon = kind === "added" ? Plus : kind === "removed" ? Minus : Pencil;
  const tone = kind === "added" ? "text-success" : kind === "removed" ? "text-danger" : "text-warning";
  return (
    <div className={`flex items-center gap-2 rounded-md border border-border-soft bg-surface-2/40 px-3 py-1.5 text-xs font-mono ${tone}`}>
      <Icon size={12} className="shrink-0" />
      {label}
    </div>
  );
}
