"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CodeBlock({ code, language = "yaml", className }: { code: string; language?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied — non-critical
    }
  }

  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-border bg-black/40", className)}>
      <div className="flex items-center justify-between border-b border-border-soft px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-white/5 hover:text-foreground"
          type="button"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mono overflow-x-auto p-3 text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
