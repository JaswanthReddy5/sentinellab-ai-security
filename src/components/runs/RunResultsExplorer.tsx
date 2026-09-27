"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, actionTone, severityTone, verdictTone } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { categoryLabel } from "@/lib/categories";
import { truncate } from "@/lib/utils";
import type { TestResult } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "CRITICAL_BYPASS", label: "Critical Bypasses" },
  { key: "FALSE_POSITIVE", label: "False Positives" },
  { key: "REVIEW_MISMATCH", label: "Review Mismatches" },
  { key: "PASS", label: "Passed" },
] as const;

const RECOMMENDATION_HINTS: Record<string, string> = {
  indirect_prompt_injection:
    "The current policy checks direct user input but does not inspect untrusted retrieved content. Apply equivalent security evaluation to untrusted retrieved content.",
  malicious_document_injection:
    "Embedded instructions inside ingested documents were treated as trusted content. Add explicit malicious-document detection before content reaches the model context.",
  tool_abuse: "A connected tool was invoked outside its intended scope. Constrain tool destinations to an explicit allow-list.",
  data_exfiltration: "Sensitive data reached an external destination. Add a default-deny rule for external destinations.",
};

export function RunResultsExplorer({ results }: { results: TestResult[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: results.length };
    for (const r of results) c[r.verdict] = (c[r.verdict] ?? 0) + 1;
    return c;
  }, [results]);

  const filtered = filter === "all" ? results : results.filter((r) => r.verdict === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === f.key ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {f.label} <span className="text-muted-2">({counts[f.key] ?? 0})</span>
          </button>
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH className="w-6" />
            <TH>Category</TH>
            <TH>Prompt</TH>
            <TH>Expected</TH>
            <TH>Actual</TH>
            <TH>Verdict</TH>
            <TH>Severity</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((r) => {
            const isOpen = expanded === r.id;
            const isBypass = r.verdict === "CRITICAL_BYPASS";
            return (
              <Fragment key={r.id}>
                <TR className="cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <TD>{isOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}</TD>
                  <TD className="text-xs text-muted">{categoryLabel(r.testCase.attackCategory)}</TD>
                  <TD className="max-w-md text-xs text-muted">{truncate(r.testCase.prompt, 80)}</TD>
                  <TD>
                    <Badge tone={actionTone(r.testCase.expectedAction)}>{r.testCase.expectedAction}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={actionTone(r.actualAction)}>{r.actualAction}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={verdictTone(r.verdict)}>{r.verdict.replace(/_/g, " ")}</Badge>
                  </TD>
                  <TD className="capitalize text-xs text-muted">{r.testCase.severity}</TD>
                </TR>
                {isOpen && (
                  <TR>
                    <TD colSpan={7} className="bg-surface-2/40">
                      <div className="flex flex-col gap-3 p-2">
                        {isBypass && (
                          <div className="flex items-center gap-2 rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs font-medium text-critical">
                            CRITICAL BYPASS — this test case was expected to be blocked but was allowed through.
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                          <Detail label="Attack Category" value={categoryLabel(r.testCase.attackCategory)} />
                          <Detail label="Severity" value={<Badge tone={severityTone(r.testCase.severity)}>{r.testCase.severity}</Badge>} />
                          <Detail label="Mutation Type" value={r.testCase.mutationType ?? "—"} />
                          <Detail label="Expected Action" value={<Badge tone={actionTone(r.testCase.expectedAction)}>{r.testCase.expectedAction}</Badge>} />
                          <Detail label="Actual Action" value={<Badge tone={actionTone(r.actualAction)}>{r.actualAction}</Badge>} />
                          <Detail label="Confidence" value={`${(r.confidence * 100).toFixed(0)}%`} />
                        </div>
                        <Detail label="Test Prompt" value={<span className="mono block whitespace-pre-wrap text-foreground/90">{r.testCase.prompt}</span>} full />
                        <Detail label="Why" value={r.testCase.reason} full />
                        {r.matchedRules.length > 0 && <Detail label="Matched Rules" value={<span className="mono">{r.matchedRules.join(", ")}</span>} full />}
                        {r.missingDetections.length > 0 && (
                          <Detail label="Missing Detection" value={<span className="mono text-warning">{r.missingDetections.join(", ")}</span>} full />
                        )}
                        {isBypass && r.testCase.attackCategory && RECOMMENDATION_HINTS[r.testCase.attackCategory] && (
                          <Detail
                            label="Recommended Mitigation"
                            value={<span className="text-success">{RECOMMENDATION_HINTS[r.testCase.attackCategory]}</span>}
                            full
                          />
                        )}
                      </div>
                    </TD>
                  </TR>
                )}
              </Fragment>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-2">{label}</div>
      <div className="mt-0.5 text-foreground/90">{value}</div>
    </div>
  );
}
