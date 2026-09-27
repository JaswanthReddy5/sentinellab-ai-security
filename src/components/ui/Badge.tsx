import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "critical" | "accent";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-white/5 text-muted border-border",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  critical: "bg-critical/15 text-critical border-critical/40",
  accent: "bg-accent/10 text-accent border-accent/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}

export function actionTone(action: "ALLOW" | "BLOCK" | "REVIEW"): BadgeTone {
  if (action === "BLOCK") return "danger";
  if (action === "REVIEW") return "warning";
  return "success";
}

export function severityTone(severity: "low" | "medium" | "high" | "critical"): BadgeTone {
  if (severity === "critical") return "critical";
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "neutral";
}

export function verdictTone(verdict: string): BadgeTone {
  if (verdict === "PASS") return "success";
  if (verdict === "CRITICAL_BYPASS") return "critical";
  if (verdict === "FALSE_POSITIVE") return "warning";
  if (verdict === "REVIEW_MISMATCH") return "warning";
  return "danger";
}
