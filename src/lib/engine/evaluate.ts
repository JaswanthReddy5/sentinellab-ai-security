import type { EvalAction, EvaluationOutcome, PolicyDocument, Severity } from "../types";
import { runDetector, DEFAULT_SEVERITY, type DetectionMatch } from "../detection";
import { extractDomains, classifyDomain } from "../detection/toolAbuse";

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const ACTION_RANK: Record<EvalAction, number> = { ALLOW: 0, REVIEW: 1, BLOCK: 2 };

function toEvalAction(action: "block" | "review" | "allow"): EvalAction {
  if (action === "block") return "BLOCK";
  if (action === "review") return "REVIEW";
  return "ALLOW";
}

function internalDomainsFromPolicy(doc: PolicyDocument): string[] {
  const domains: string[] = [];
  // Heuristic: derive an internal domain from the policy name when tools reference "internal_domains".
  const slug = doc.policy.name.replace(/[^a-zA-Z0-9]+/g, "");
  domains.push(`${slug.toLowerCase() || "company"}.com`, "company.com");
  return domains;
}

/**
 * Deterministic, rule-based policy evaluation engine.
 * No LLM call is required — this is the primary evaluator used everywhere,
 * including the deployed demo, so results are 100% reproducible.
 */
export function evaluatePolicy(doc: PolicyDocument, prompt: string): EvaluationOutcome {
  const internalDomains = internalDomainsFromPolicy(doc);
  const rules = doc.rules ?? [];

  let bestAction: EvalAction = "ALLOW";
  let bestSeverity: Severity = "low";
  const matchedRules: string[] = [];
  const allMatches: DetectionMatch[] = [];
  const triggeredDetectTypes = new Set<string>();

  for (const rule of rules) {
    const matches = runDetector(rule.detect, prompt, internalDomains);
    if (matches.length > 0) {
      triggeredDetectTypes.add(rule.detect);
      allMatches.push(...matches);
      const action = toEvalAction(rule.action);
      const severity = rule.severity ?? DEFAULT_SEVERITY[rule.detect];
      if (ACTION_RANK[action] > ACTION_RANK[bestAction]) {
        bestAction = action;
      }
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[bestSeverity]) {
        bestSeverity = severity;
      }
      matchedRules.push(`${rule.detect}→${rule.action}`);
    }
  }

  // Tool-specific evaluation (e.g. send_email allowed/blocked domain lists).
  const missingDetections: string[] = [];
  if (doc.tools) {
    for (const [toolName, toolPolicy] of Object.entries(doc.tools)) {
      const domains = extractDomains(prompt);
      const allowedInternal = Boolean(toolPolicy.allowed?.includes("internal_domains"));
      const blockedExternal = Boolean(toolPolicy.blocked?.includes("external_domains"));
      const explicitAllowed = (toolPolicy.allowed_domains ?? []).map((d) => d.toLowerCase());
      const explicitBlocked = (toolPolicy.blocked_domains ?? []).map((d) => d.toLowerCase());

      for (const domain of domains) {
        if (explicitBlocked.includes(domain)) {
          matchedRules.push(`${toolName}.blocked_domains→block`);
          allMatches.push({ type: "blocked_domain", pattern: "explicit-list", snippet: domain });
          bestAction = "BLOCK";
          bestSeverity = SEVERITY_RANK[bestSeverity] < SEVERITY_RANK.high ? "high" : bestSeverity;
          continue;
        }
        if (explicitAllowed.includes(domain)) continue;

        if (allowedInternal || blockedExternal) {
          const cls = classifyDomain(domain, internalDomains);
          if (cls.classification === "external" && blockedExternal) {
            matchedRules.push(`${toolName}.external_domains→block`);
            allMatches.push({ type: "external_domain", pattern: "domain-classification", snippet: domain });
            bestAction = "BLOCK";
            bestSeverity = SEVERITY_RANK[bestSeverity] < SEVERITY_RANK.high ? "high" : bestSeverity;
          } else if (cls.classification === "lookalike") {
            matchedRules.push(`${toolName}.domain_lookalike→review`);
            allMatches.push({ type: "lookalike_domain", pattern: "edit-distance<=2", snippet: domain });
            if (ACTION_RANK.REVIEW > ACTION_RANK[bestAction]) bestAction = "REVIEW";
            if (SEVERITY_RANK[bestSeverity] < SEVERITY_RANK.medium) bestSeverity = "medium";
          }
        }
      }
    }
  }

  // Detect coverage gaps: signals present in the prompt that no rule inspects.
  const ALL_DETECT_TYPES = [
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
  ] as const;
  const coveredTypes = new Set(rules.map((r) => r.detect));
  for (const type of ALL_DETECT_TYPES) {
    if (coveredTypes.has(type)) continue;
    const matches = runDetector(type, prompt, internalDomains);
    if (matches.length > 0) {
      missingDetections.push(type);
    }
  }

  const matchCount = allMatches.length;
  let confidence: number;
  if (bestAction === "BLOCK") confidence = Math.min(0.99, 0.62 + matchCount * 0.09);
  else if (bestAction === "REVIEW") confidence = Math.min(0.85, 0.5 + matchCount * 0.07);
  else confidence = missingDetections.length > 0 ? 0.55 : 0.92;

  const reason =
    matchedRules.length > 0
      ? `Matched: ${matchedRules.join(", ")} (${matchCount} signal${matchCount === 1 ? "" : "s"} detected).`
      : missingDetections.length > 0
        ? `No policy rule inspects: ${missingDetections.join(", ")}, though signals were present.`
        : "No policy rule matched this input.";

  return {
    action: bestAction,
    matchedRules: [...new Set(matchedRules)],
    missingDetections,
    confidence: Number(confidence.toFixed(2)),
    severity: bestSeverity,
    reason,
  };
}
