import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PlayCircle } from "lucide-react";

export function Topbar({ demoMode, llmMode }: { demoMode: boolean; llmMode: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border-soft bg-surface/30 px-4 py-3 print:hidden lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-sm font-semibold text-foreground">SentinelLab</span>
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        <Badge tone={demoMode ? "accent" : "success"}>{demoMode ? "Demo Mode — in-memory data" : "Connected to Postgres"}</Badge>
        <Badge tone="neutral">Engine: {llmMode === "deterministic-local" ? "Deterministic local" : "LLM-assisted"}</Badge>
      </div>
      <Link
        href="/runs"
        className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
      >
        <PlayCircle size={14} />
        Run Security Test
      </Link>
    </header>
  );
}
