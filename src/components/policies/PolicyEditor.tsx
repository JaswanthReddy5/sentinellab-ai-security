"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { parsePolicy, serializePolicy, SAMPLE_POLICY_YAML } from "@/lib/policy/parser";
import type { DetectType, PolicyAction, Severity } from "@/lib/types";

const DETECT_OPTIONS: DetectType[] = [
  "pii",
  "confidential_data",
  "credentials",
  "secrets",
  "prompt_injection",
  "jailbreak",
  "tool_abuse",
  "data_exfiltration",
  "privilege_escalation",
  "excessive_agency",
  "malicious_document",
  "policy_evasion",
];
const ACTION_OPTIONS: PolicyAction[] = ["block", "review", "allow"];
const SEVERITY_OPTIONS: Severity[] = ["low", "medium", "high", "critical"];

interface RuleDraft {
  detect: DetectType;
  action: PolicyAction;
  severity: Severity;
}

export function PolicyEditor({ mode: initialMode = "form", policyId }: { mode?: "form" | "yaml"; policyId?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"form" | "yaml">(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form-mode state
  const [name, setName] = useState("new_security_policy");
  const [version, setVersion] = useState("1.0");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<RuleDraft[]>([{ detect: "pii", action: "block", severity: "high" }]);
  const [useToolPolicy, setUseToolPolicy] = useState(false);

  // YAML-mode state
  const [rawYaml, setRawYaml] = useState(SAMPLE_POLICY_YAML);

  const generatedYaml = useMemo(() => {
    if (mode === "yaml") return rawYaml;
    const doc = {
      policy: { name, version, description: description || undefined },
      rules,
      tools: useToolPolicy
        ? { send_email: { allowed: ["internal_domains"], blocked: ["external_domains"] } }
        : undefined,
    };
    return serializePolicy(doc as never, "yaml");
  }, [mode, rawYaml, name, version, description, rules, useToolPolicy]);

  const parseResult = useMemo(() => parsePolicy(generatedYaml), [generatedYaml]);

  function addRule() {
    setRules((r) => [...r, { detect: "pii", action: "block", severity: "medium" }]);
  }
  function updateRule(idx: number, patch: Partial<RuleDraft>) {
    setRules((r) => r.map((rule, i) => (i === idx ? { ...rule, ...patch } : rule)));
  }
  function removeRule(idx: number) {
    setRules((r) => r.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setServerError(null);
    if (!parseResult.ok) {
      setServerError("Fix validation errors before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const url = policyId ? `/api/policies/${policyId}/versions` : "/api/policies";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: generatedYaml, format: "yaml" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save policy");
      const targetId = policyId ?? data.policy?.id;
      router.push(`/policies/${targetId}`);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("form")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "form" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"}`}
          >
            Form Builder
          </button>
          <button
            type="button"
            onClick={() => setMode("yaml")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "yaml" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"}`}
          >
            YAML / JSON Editor
          </button>
        </div>

        {mode === "form" ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface/60 p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Policy name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Version
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
              />
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-2">Detection Rules</span>
                <Button type="button" variant="secondary" size="sm" onClick={addRule}>
                  <Plus size={12} /> Add rule
                </Button>
              </div>
              {rules.map((rule, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 rounded-lg border border-border-soft bg-surface-2/50 p-2">
                  <Select value={rule.detect} onChange={(e) => updateRule(idx, { detect: e.target.value as DetectType })}>
                    {DETECT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                  <Select value={rule.action} onChange={(e) => updateRule(idx, { action: e.target.value as PolicyAction })}>
                    {ACTION_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                  <Select value={rule.severity} onChange={(e) => updateRule(idx, { severity: e.target.value as Severity })}>
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  <button type="button" onClick={() => removeRule(idx)} className="text-muted hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {rules.length === 0 && <p className="text-xs text-muted">No rules defined — every request will be allowed.</p>}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={useToolPolicy} onChange={(e) => setUseToolPolicy(e.target.checked)} className="accent-cyan-400" />
              Restrict <span className="mono">send_email</span> tool to internal domains only
            </label>
          </div>
        ) : (
          <textarea
            value={rawYaml}
            onChange={(e) => setRawYaml(e.target.value)}
            rows={22}
            spellCheck={false}
            className="mono w-full rounded-xl border border-border bg-black/40 p-4 text-xs text-foreground outline-none focus:border-accent/50"
          />
        )}

        {serverError && <p className="text-xs text-danger">{serverError}</p>}
        <Button onClick={handleSubmit} disabled={submitting || !parseResult.ok}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {policyId ? "Save New Version" : "Create Policy"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-2">Preview & Validation</span>
        <CodeBlock code={generatedYaml} language="yaml" />
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/60 p-4">
          {parseResult.ok ? (
            <Badge tone="success">Valid policy document</Badge>
          ) : (
            <Badge tone="danger">{parseResult.issues.length} validation error{parseResult.issues.length === 1 ? "" : "s"}</Badge>
          )}
          {parseResult.issues.map((issue, i) => (
            <p key={i} className="text-xs text-danger">
              <span className="mono text-muted-2">{issue.path}</span>: {issue.message}
            </p>
          ))}
          {parseResult.warnings.map((warning, i) => (
            <p key={i} className="text-xs text-warning">
              <span className="mono text-muted-2">{warning.path}</span>: {warning.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
