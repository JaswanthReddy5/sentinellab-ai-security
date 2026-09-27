"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { TestRun } from "@/lib/types";

export function ThresholdChecker({ runs }: { runs: TestRun[] }) {
  const sorted = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [runId, setRunId] = useState(sorted[0]?.id ?? "");
  const [threshold, setThreshold] = useState(95);
  const run = sorted.find((r) => r.id === runId);
  const passed = run ? run.stats.securityCoverage >= threshold : null;

  if (sorted.length === 0) {
    return <p className="text-sm text-muted">Run a security test first to simulate a CI threshold check.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Test run
          <Select value={runId} onChange={(e) => setRunId(e.target.value)}>
            {sorted.map((r) => (
              <option key={r.id} value={r.id}>
                {r.policyName} — {r.policyVersionLabel} ({r.stats.securityCoverage}%)
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          minimum_security_coverage
          <input
            type="number"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
        </label>
      </div>

      {run && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 font-mono text-sm ${
            passed ? "border-success/40 bg-success/5 text-success" : "border-danger/40 bg-danger/5 text-danger"
          }`}
        >
          {passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <div>
            <div>Current: {run.stats.securityCoverage}%</div>
            {passed ? <div>✅ Security check passed</div> : <div>❌ SECURITY REGRESSION — CI FAILED</div>}
          </div>
        </div>
      )}
    </div>
  );
}
