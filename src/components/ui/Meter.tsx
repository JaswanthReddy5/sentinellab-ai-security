import { cn } from "@/lib/utils";

export function Meter({ value, tone = "accent", className }: { value: number; tone?: "accent" | "success" | "warning" | "danger"; className?: string }) {
  const toneClasses: Record<string, string> = {
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div
        className={cn("h-full rounded-full transition-all", toneClasses[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function coverageTone(value: number): "success" | "warning" | "danger" {
  if (value >= 95) return "success";
  if (value >= 85) return "warning";
  return "danger";
}
