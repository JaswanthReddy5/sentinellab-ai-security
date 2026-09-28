"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import type { AttackCategoryKey } from "@/lib/types";

export interface RegressionDemoData {
  regressionId: string;
  baselineLabel: string;
  currentLabel: string;
  baselineTestCount: number;
  currentTestCount: number;
  matchedCount: number;
  previousCoverage: number;
  currentCoverage: number;
  changePoints: number;
  newBypassCount: number;
  newFalsePositiveCount: number;
  topRegression: { category: AttackCategoryKey; baseline: number; current: number; newBypasses: number } | null;
  topBypassPrompt: string | null;
}

type Stage = 0 | 1 | 2 | 3 | 4;

const STAGE_LABELS = [
  "Loading baseline policy...",
  "Loading current policy...",
  "Comparing matched test cases...",
  "Analyzing security regressions...",
];

export function RunRegressionDemo({ data }: { data: RegressionDemoData }) {
  const [stage, setStage] = useState<Stage>(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function run() {
    setRunning(true);
    setDone(false);
    setStage(0);
    const delays = [500, 900, 1300, 1700];
    delays.forEach((delay, i) => {
      setTimeout(() => setStage((i + 1) as Stage), delay);
    });
    setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, 2100);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      {!running && !done && (
        <button
          onClick={run}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black hover:bg-accent-strong"
        >
          <Play size={16} /> RUN REGRESSION DEMO
        </button>
      )}

      {running && (
        <div className="w-full rounded-xl border border-border bg-surface/70 p-6 text-left font-mono text-sm">
          {STAGE_LABELS.map((label, i) => {
            const isDone = stage > i;
            const isActive = stage === i;
            if (stage < i) return null;
            return (
              <div key={label} className="mb-2 flex items-center gap-2 text-foreground/90">
                {isDone ? <CheckCircle2 size={14} className="text-success" /> : isActive ? <Loader2 size={14} className="animate-spin text-accent" /> : null}
                <span>{label}</span>
                {isDone && i === 0 && <span className="text-success">✓ {data.baselineTestCount.toLocaleString()} tests</span>}
                {isDone && i === 1 && <span className="text-success">✓ {data.currentTestCount.toLocaleString()} tests</span>}
                {isDone && i === 2 && <span className="text-success">✓ {data.matchedCount.toLocaleString()} matched</span>}
              </div>
            );
          })}
        </div>
      )}

      {done && (
        <div className="w-full rounded-xl border border-danger/40 bg-danger/5 p-6 text-left">
          <div className="mb-3 flex items-center gap-2">
            <TriangleAlert size={18} className="text-danger" />
            <h3 className="text-base font-bold tracking-tight text-danger">SECURITY REGRESSION DETECTED</h3>
          </div>
          <p className="mb-4 text-sm text-muted">
            {data.baselineLabel} → {data.currentLabel}
          </p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Security Coverage" value={`${data.previousCoverage}% → ${data.currentCoverage}%`} />
            <Stat label="Change" value={`${data.changePoints} pts`} accent="danger" />
            <Stat label="New Bypasses" value={String(data.newBypassCount)} accent="danger" />
            <Stat label="New False Positives" value={String(data.newFalsePositiveCount)} />
          </div>
          {data.topRegression && (
            <div className="mb-5 flex flex-col gap-3">
              <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-2">↓ Why? ↓</div>
              <div className="rounded-lg border border-border-soft bg-surface-2/50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Worst-Hit Category</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">{categoryLabel(data.topRegression.category)}</span>
                  <span className="text-xs text-muted">
                    {data.topRegression.baseline}% → {data.topRegression.current}% · {data.topRegression.newBypasses} new bypass
                    {data.topRegression.newBypasses === 1 ? "" : "es"}
                  </span>
                </div>
              </div>
              {data.topBypassPrompt && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Exact Attack That Got Through</div>
                  <p className="mono mt-1 text-xs text-foreground/90">{data.topBypassPrompt}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/regression/${data.regressionId}`}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-strong"
            >
              INVESTIGATE BYPASSES
            </Link>
            <button onClick={run} className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-foreground">
              Run again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "danger" }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2/40 p-2.5 text-center">
      <div className={`text-sm font-semibold ${accent === "danger" ? "text-danger" : "text-foreground"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
    </div>
  );
}
