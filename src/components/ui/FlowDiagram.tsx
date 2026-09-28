import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlowStep {
  label: string;
  value: ReactNode;
  tone?: "default" | "danger" | "success" | "warning" | "accent";
  mono?: boolean;
}

const TONE_CLASSES: Record<NonNullable<FlowStep["tone"]>, string> = {
  default: "border-border bg-surface-2/50 text-foreground",
  danger: "border-danger/40 bg-danger/10 text-danger",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  accent: "border-accent/40 bg-accent/10 text-accent",
};

/**
 * Renders the policy → test → regression → root-cause → fix chain as one
 * continuous, real-data vertical narrative — the point is that a viewer
 * never has to infer the connection between pages themselves.
 */
export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-stretch">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className={cn("w-full rounded-lg border px-4 py-2.5 text-center", TONE_CLASSES[step.tone ?? "default"])}>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{step.label}</div>
            <div className={cn("mt-0.5 text-sm font-semibold leading-snug", step.mono && "mono font-normal")}>{step.value}</div>
          </div>
          {i < steps.length - 1 && <ChevronDown size={16} className="my-1 shrink-0 text-muted-2" />}
        </div>
      ))}
    </div>
  );
}
