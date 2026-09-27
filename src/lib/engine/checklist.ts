import type { AttackCategoryKey, DetectType, PolicyDocument } from "../types";

export interface ChecklistItem {
  label: string;
  passed: boolean;
}

const BASE_CHECKS: Array<{ label: string; detect: DetectType }> = [
  { label: "PII detector executed", detect: "pii" },
  { label: "Secret / credential detector executed", detect: "credentials" },
  { label: "Prompt-injection detector executed", detect: "prompt_injection" },
  { label: "Tool-abuse detector executed", detect: "tool_abuse" },
];

/**
 * Builds the "what did the policy actually check" narrative shown on a
 * bypass investigation page. This reflects the CURRENT policy's declared
 * rules and tool config — it is a structural summary, not a guess.
 */
export function buildEvaluationChecklist(doc: PolicyDocument, category: AttackCategoryKey | null): ChecklistItem[] {
  const configuredDetects = new Set((doc.rules ?? []).map((r) => r.detect));
  const items: ChecklistItem[] = [{ label: "User prompt inspected", passed: true }];

  for (const check of BASE_CHECKS) {
    items.push({ label: check.label, passed: configuredDetects.has(check.detect) });
  }

  if (category === "indirect_prompt_injection" || category === "malicious_document_injection") {
    items.push({ label: "Untrusted retrieved/document content inspected with equivalent controls", passed: configuredDetects.has("malicious_document") });
  }

  if (category === "tool_abuse" || category === "data_exfiltration") {
    const hasDestinationControl = Object.values(doc.tools ?? {}).some(
      (t) => (t.blocked_domains?.length ?? 0) > 0 || t.blocked?.includes("external_domains")
    );
    items.push({ label: "Tool destination validated against an allow/deny list", passed: hasDestinationControl });
  }

  if (category === "excessive_agency") {
    const rule = (doc.rules ?? []).find((r) => r.detect === "excessive_agency");
    items.push({ label: "High-impact autonomous actions require human confirmation", passed: Boolean(rule && rule.action !== "allow") });
  }

  if (category === "policy_evasion") {
    items.push({ label: "Obfuscation / filter-evasion phrasing detector executed", passed: configuredDetects.has("policy_evasion") });
  }

  return items;
}
