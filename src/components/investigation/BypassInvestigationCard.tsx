import { Check, X } from "lucide-react";
import { Badge, actionTone, severityTone } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import type { ChecklistItem } from "@/lib/engine/checklist";
import type { EvalAction, Severity } from "@/lib/types";

export function BypassInvestigationCard({
  categoryLabel,
  severity,
  mutationType,
  prompt,
  expectedAction,
  previousAction,
  currentAction,
  checklist,
  rootCause,
  recommendation,
}: {
  categoryLabel: string;
  severity: Severity;
  mutationType?: string | null;
  prompt: string;
  expectedAction: EvalAction;
  previousAction?: EvalAction | null;
  currentAction: EvalAction;
  checklist: ChecklistItem[];
  rootCause: string;
  recommendation?: { problem: string; recommendation: string; policySnippet: string } | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-border bg-surface/60 p-5 sm:grid-cols-4">
        <Field label="Attack Category" value={categoryLabel} />
        <Field label="Severity" value={<Badge tone={severityTone(severity)}>{severity}</Badge>} />
        <Field label="Mutation" value={mutationType ?? "—"} />
        <Field label="Expected" value={<Badge tone={actionTone(expectedAction)}>{expectedAction}</Badge>} />
        {previousAction && <Field label="Previous Policy" value={<Badge tone={actionTone(previousAction)}>{previousAction}</Badge>} />}
        <Field label="Current Policy" value={<Badge tone={actionTone(currentAction)}>{currentAction}</Badge>} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Test Prompt</h3>
        <CodeBlock code={prompt} language="text" />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Policy Evaluation</h3>
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface/60 p-4">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.passed ? <Check size={14} className="shrink-0 text-success" /> : <X size={14} className="shrink-0 text-danger" />}
              <span className={item.passed ? "text-foreground/90" : "text-danger"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Root Cause</h3>
        <p className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm leading-relaxed text-foreground/90">{rootCause}</p>
      </div>

      {recommendation && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
            Recommended Control <span className="normal-case text-muted-2">(prototype recommendation)</span>
          </h3>
          <p className="mb-3 text-sm text-foreground/90">{recommendation.recommendation}</p>
          <CodeBlock code={recommendation.policySnippet} language="yaml" />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-2">{label}</div>
      <div className="mt-0.5 text-sm text-foreground/90">{value}</div>
    </div>
  );
}
