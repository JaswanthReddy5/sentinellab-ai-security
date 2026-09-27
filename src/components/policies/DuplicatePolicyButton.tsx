"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { parsePolicy, serializePolicy } from "@/lib/policy/parser";

export function DuplicatePolicyButton({ raw, sourceName }: { raw: string; sourceName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setLoading(true);
    setError(null);
    try {
      const parsed = parsePolicy(raw);
      if (!parsed.ok || !parsed.document) throw new Error("Source policy failed to parse");
      const duplicateDoc = {
        ...parsed.document,
        policy: { ...parsed.document.policy, name: `${sourceName}_copy` },
      };
      const duplicateRaw = serializePolicy(duplicateDoc, "yaml");

      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: duplicateRaw, format: "yaml" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate policy");
      router.push(`/policies/${data.policy.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={handleDuplicate} disabled={loading}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
        Duplicate
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
