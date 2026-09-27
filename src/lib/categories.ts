import type { AttackCategoryInfo, AttackCategoryKey, MutationType } from "./types";

export const ATTACK_CATEGORIES: AttackCategoryInfo[] = [
  {
    key: "direct_prompt_injection",
    label: "Direct Prompt Injection",
    description: "User input directly attempts to override system instructions.",
  },
  {
    key: "indirect_prompt_injection",
    label: "Indirect Prompt Injection",
    description: "Instructions are smuggled in via untrusted retrieved or referenced content.",
  },
  {
    key: "jailbreak",
    label: "Jailbreak / Instruction Override",
    description: "Attempts to remove safety constraints via persona or hierarchy manipulation.",
  },
  {
    key: "sensitive_data_extraction",
    label: "Sensitive Data Extraction",
    description: "Attempts to extract system prompts, internal configuration, or protected data.",
  },
  {
    key: "pii_leakage",
    label: "PII Leakage",
    description: "Requests that would expose personally identifiable information.",
  },
  {
    key: "credential_exposure",
    label: "Credential / Secret Exposure",
    description: "Requests that would reveal API keys, tokens, or credentials.",
  },
  {
    key: "tool_abuse",
    label: "Tool Abuse",
    description: "Attempts to misuse connected tools outside their intended scope.",
  },
  {
    key: "privilege_escalation",
    label: "Privilege Escalation",
    description: "Attempts to gain elevated permissions or bypass authorization checks.",
  },
  {
    key: "data_exfiltration",
    label: "Data Exfiltration",
    description: "Attempts to move sensitive data to an unauthorized external destination.",
  },
  {
    key: "excessive_agency",
    label: "Excessive Agency",
    description: "Requests that push an agent to take actions beyond its granted scope.",
  },
  {
    key: "malicious_document_injection",
    label: "Malicious Document Injection",
    description: "Untrusted documents contain embedded instructions targeting the agent.",
  },
  {
    key: "policy_evasion",
    label: "Policy Evasion",
    description: "Techniques designed specifically to slip past known policy rules.",
  },
];

export const ATTACK_CATEGORY_MAP: Record<AttackCategoryKey, AttackCategoryInfo> =
  Object.fromEntries(ATTACK_CATEGORIES.map((c) => [c.key, c])) as Record<
    AttackCategoryKey,
    AttackCategoryInfo
  >;

export const MUTATION_TYPES: { key: MutationType; label: string }[] = [
  { key: "direct_rephrasing", label: "Direct Rephrasing" },
  { key: "roleplay_framing", label: "Role-Play Framing" },
  { key: "instruction_hierarchy_manipulation", label: "Instruction Hierarchy Manipulation" },
  { key: "obfuscation", label: "Obfuscation" },
  { key: "unicode_variation", label: "Unicode Variation" },
  { key: "encoded_payload", label: "Encoded Payload (Base64-style)" },
  { key: "multi_step_instructions", label: "Multi-Step Instructions" },
  { key: "indirect_injection", label: "Indirect Prompt Injection" },
  { key: "retrieved_document_injection", label: "Retrieved-Document Injection" },
  { key: "tool_use_manipulation", label: "Tool-Use Manipulation" },
  { key: "context_switching", label: "Context Switching" },
  { key: "social_engineering", label: "Social-Engineering Framing" },
];

export function categoryLabel(key: AttackCategoryKey | null): string {
  if (!key) return "General";
  return ATTACK_CATEGORY_MAP[key]?.label ?? key;
}
