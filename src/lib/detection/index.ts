import type { DetectType, Severity } from "../types";
import type { DetectionMatch } from "./pii";
import { detectPII } from "./pii";
import { detectSecrets } from "./secrets";
import {
  detectPromptInjection,
  detectIndirectInjection,
  detectUnicodeObfuscation,
  detectEncodedPayload,
} from "./injection";
import {
  detectDataExfiltration,
  detectToolAbuse,
  detectPrivilegeEscalation,
  detectExcessiveAgency,
} from "./toolAbuse";

export type { DetectionMatch } from "./pii";

const POLICY_EVASION_RE = [
  /\bwithout (triggering|tripping|setting off) (the )?(filters?|alarms?|detection)\b/i,
  /\bin a way that (avoids|evades|bypasses) (the )?(policy|filter|moderation|detection)\b/i,
  /\bsplit (this|the) (request|message) (into|across) (multiple|several) (parts|messages)\b/i,
  /\brephrase (this|it) so it (doesn't|does not) (get flagged|trigger|match)\b/i,
];

function detectPolicyEvasion(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  for (const re of POLICY_EVASION_RE) {
    const m = text.match(re);
    if (m) matches.push({ type: "policy_evasion_language", pattern: re.source, snippet: m[0].slice(0, 80) });
  }
  matches.push(...detectUnicodeObfuscation(text));
  return matches;
}

const MALICIOUS_DOC_RE = [
  /\[(system|instruction|admin)\]/i,
  /<!--\s*(instruction|system)/i,
  /\bwhen (this document|this page|this file) is (read|summarized|processed)\b/i,
];

function detectMaliciousDocument(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [...detectIndirectInjection(text)];
  for (const re of MALICIOUS_DOC_RE) {
    const m = text.match(re);
    if (m) matches.push({ type: "embedded_document_instruction", pattern: re.source, snippet: m[0].slice(0, 80) });
  }
  return matches;
}

export function runDetector(
  type: DetectType,
  text: string,
  internalDomains: string[]
): DetectionMatch[] {
  switch (type) {
    case "pii":
      return detectPII(text, internalDomains);
    case "confidential_data":
      return [
        ...detectDataExfiltration(text, internalDomains).filter((m) => m.type === "sensitive_export_request" || m.type === "exfiltration_pattern"),
      ];
    case "credentials":
    case "secrets":
      return detectSecrets(text);
    case "prompt_injection":
      return [...detectPromptInjection(text), ...detectIndirectInjection(text), ...detectEncodedPayload(text)];
    case "jailbreak":
      return detectPromptInjection(text);
    case "tool_abuse":
      return detectToolAbuse(text, internalDomains);
    case "data_exfiltration":
      return detectDataExfiltration(text, internalDomains);
    case "privilege_escalation":
      return detectPrivilegeEscalation(text);
    case "excessive_agency":
      return detectExcessiveAgency(text);
    case "malicious_document":
      return detectMaliciousDocument(text);
    case "policy_evasion":
      return detectPolicyEvasion(text);
    default:
      return [];
  }
}

export const DEFAULT_SEVERITY: Record<DetectType, Severity> = {
  pii: "high",
  confidential_data: "high",
  credentials: "critical",
  secrets: "critical",
  prompt_injection: "high",
  jailbreak: "high",
  tool_abuse: "high",
  data_exfiltration: "critical",
  privilege_escalation: "critical",
  excessive_agency: "medium",
  malicious_document: "high",
  policy_evasion: "medium",
};
