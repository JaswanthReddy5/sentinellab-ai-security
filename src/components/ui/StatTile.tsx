import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Trend = "up-good" | "down-good" | "neutral";

export function StatTile({
  label,
  value,
  sublabel,
  icon,
  trend,
  trendValue,
  accent = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  trend?: Trend;
  trendValue?: string;
  accent?: "default" | "danger" | "warning" | "success" | "accent";
}) {
  const accentClasses: Record<string, string> = {
    default: "text-foreground",
    danger: "text-danger",
    warning: "text-warning",
    success: "text-success",
    accent: "text-accent",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</span>
        {icon && <span className="text-muted-2">{icon}</span>}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", accentClasses[accent])}>{value}</div>
      {(sublabel || trendValue) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {trendValue && (
            <span
              className={cn(
                "font-medium",
                trend === "up-good" && "text-success",
                trend === "down-good" && "text-danger",
                trend === "neutral" && "text-muted"
              )}
            >
              {trendValue}
            </span>
          )}
          {sublabel && <span className="text-muted-2">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
