import { z } from "zod";

export const detectTypeSchema = z.enum([
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
]);

export const policyActionSchema = z.enum(["block", "review", "allow"]);
export const severitySchema = z.enum(["low", "medium", "high", "critical"]);

export const policyRuleSchema = z.object({
  detect: detectTypeSchema,
  action: policyActionSchema,
  severity: severitySchema.optional(),
});

export const toolPolicySchema = z.object({
  allowed: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});

export const policyDocumentSchema = z.object({
  policy: z.object({
    name: z
      .string()
      .min(2, "Policy name must be at least 2 characters")
      .regex(/^[a-zA-Z0-9_\- ]+$/, "Policy name may only contain letters, numbers, spaces, - and _"),
    version: z.string().min(1, "Policy version is required"),
    description: z.string().optional(),
  }),
  rules: z.array(policyRuleSchema).optional().default([]),
  tools: z.record(z.string(), toolPolicySchema).optional(),
});

export type PolicyDocumentInput = z.infer<typeof policyDocumentSchema>;

export function policyHasAnyDetection(doc: PolicyDocumentInput): boolean {
  const hasRules = (doc.rules?.length ?? 0) > 0;
  const hasTools = doc.tools && Object.keys(doc.tools).length > 0;
  return Boolean(hasRules || hasTools);
}
