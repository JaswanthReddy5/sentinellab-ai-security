import type { AttackCategoryKey, DetectType, Recommendation, Severity, TestResult } from "../types";
import { shortId } from "../rng";
import { categoryLabel } from "../categories";

interface RecommendationTemplate {
  detect: DetectType;
  action: "block" | "review";
  problem: string;
  recommendation: string;
}

const CATEGORY_RECOMMENDATIONS: Partial<Record<AttackCategoryKey, RecommendationTemplate>> = {
  indirect_prompt_injection: {
    detect: "prompt_injection",
    action: "block",
    problem: "Untrusted retrieved or referenced content bypassed the policy because only direct user input is inspected.",
    recommendation: "Apply the same prompt-injection and confidential-data evaluation to untrusted retrieved content (documents, web pages, tool outputs) as you apply to direct user input, not just the literal user message.",
  },
  malicious_document_injection: {
    detect: "malicious_document",
    action: "block",
    problem: "Embedded instructions inside a summarized or ingested document were treated as trusted content.",
    recommendation: "Add an explicit malicious_document detection rule and strip or neutralize instruction-like content before it reaches the model context.",
  },
  data_exfiltration: {
    detect: "data_exfiltration",
    action: "block",
    problem: "Sensitive data was routed to an external destination without being blocked.",
    recommendation: "Add an external-destination restriction so any tool capable of sending data outward is blocked by default unless the destination is explicitly allow-listed.",
  },
  tool_abuse: {
    detect: "tool_abuse",
    action: "block",
    problem: "A connected tool was invoked outside of its intended scope.",
    recommendation: "Constrain tool invocation to an explicit allow-list of destinations/actions and require review for anything outside it.",
  },
  credential_exposure: {
    detect: "credentials",
    action: "block",
    problem: "The current policy does not block requests that would reveal credentials or secrets.",
    recommendation: "Add a dedicated credentials/secrets detection rule with a block action and critical severity.",
  },
  pii_leakage: {
    detect: "pii",
    action: "block",
    problem: "Personally identifiable information was returned without being blocked.",
    recommendation: "Add or tighten the PII detection rule; consider requiring review instead of allow for partial matches.",
  },
  privilege_escalation: {
    detect: "privilege_escalation",
    action: "block",
    problem: "A request attempting to gain elevated access or bypass approval was not blocked.",
    recommendation: "Add a privilege-escalation detection rule with a block action and require explicit human approval for access changes.",
  },
  excessive_agency: {
    detect: "excessive_agency",
    action: "review",
    problem: "The agent was granted authority to act without human confirmation in a high-impact scenario.",
    recommendation: "Route high-impact autonomous actions through a review rule rather than allowing unconfirmed execution.",
  },
  jailbreak: {
    detect: "jailbreak",
    action: "block",
    problem: "A role-play or persona-override jailbreak attempt was not blocked.",
    recommendation: "Add a jailbreak detection rule and monitor for known persona-override patterns (e.g. 'DAN', 'developer mode').",
  },
  direct_prompt_injection: {
    detect: "prompt_injection",
    action: "block",
    problem: "A direct instruction-override attempt was not blocked by the current policy.",
    recommendation: "Add or strengthen the prompt_injection detection rule to cover instruction-override phrasing.",
  },
  sensitive_data_extraction: {
    detect: "confidential_data",
    action: "block",
    problem: "A request attempting to extract internal configuration or system-level detail was not blocked.",
    recommendation: "Add a confidential_data rule covering system-prompt and configuration extraction attempts.",
  },
  policy_evasion: {
    detect: "policy_evasion",
    action: "review",
    problem: "A request explicitly designed to evade detection was not flagged.",
    recommendation: "Add a policy_evasion rule to flag language that references bypassing filters or splitting requests to avoid detection.",
  },
};

/** Looks up the remediation template for a single attack category, if one exists. Used by bypass investigation views. */
export function getCategoryRecommendation(category: AttackCategoryKey | null, policyName = "your_policy"): { problem: string; recommendation: string; policySnippet: string } | null {
  if (!category) return null;
  const template = CATEGORY_RECOMMENDATIONS[category];
  if (!template) return null;
  return {
    problem: template.problem,
    recommendation: template.recommendation,
    policySnippet: buildSnippet(policyName, template),
  };
}

function buildSnippet(policyName: string, template: RecommendationTemplate): string {
  return `policy:
  name: ${policyName}
  version: "next"

rules:
  - detect: ${template.detect}
    action: ${template.action}
    severity: high
`;
}

function severityFromResults(results: TestResult[]): Severity {
  const weights: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  let max: Severity = "low";
  for (const r of results) {
    if (weights[r.testCase.severity] > weights[max]) max = r.testCase.severity;
  }
  return max;
}

export function generateRecommendations(runId: string, policyName: string, results: TestResult[]): Recommendation[] {
  const bypasses = results.filter((r) => r.verdict === "CRITICAL_BYPASS" || r.verdict === "FAIL");
  const byCategory = new Map<AttackCategoryKey, TestResult[]>();
  for (const r of bypasses) {
    if (!r.testCase.attackCategory) continue;
    const list = byCategory.get(r.testCase.attackCategory) ?? [];
    list.push(r);
    byCategory.set(r.testCase.attackCategory, list);
  }

  const recommendations: Recommendation[] = [];
  for (const [category, group] of byCategory.entries()) {
    const template = CATEGORY_RECOMMENDATIONS[category];
    if (!template) continue;
    recommendations.push({
      id: shortId("rec", `${runId}:${category}`),
      runId,
      category,
      severity: severityFromResults(group),
      problem: `${categoryLabel(category)}: ${template.problem} (${group.length} affected test case${group.length === 1 ? "" : "s"}).`,
      recommendation: template.recommendation,
      policySnippet: buildSnippet(policyName, template),
      createdAt: new Date().toISOString(),
    });
  }

  return recommendations.sort((a, b) => {
    const w: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    return w[b.severity] - w[a.severity];
  });
}
