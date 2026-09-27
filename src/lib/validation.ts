import { z } from "zod";

export const createPolicySchema = z.object({
  raw: z.string().min(10, "Policy document is required"),
  format: z.enum(["yaml", "json"]).optional().default("yaml"),
});

export const attackCategoryKeys = [
  "direct_prompt_injection",
  "indirect_prompt_injection",
  "jailbreak",
  "sensitive_data_extraction",
  "pii_leakage",
  "credential_exposure",
  "tool_abuse",
  "privilege_escalation",
  "data_exfiltration",
  "excessive_agency",
  "malicious_document_injection",
  "policy_evasion",
] as const;

export const runTestSchema = z.object({
  policyVersionId: z.string().min(1),
  testCount: z.number().int().min(10).max(2000).default(200),
  categories: z.array(z.enum(attackCategoryKeys)).default([]),
  mutationLevel: z.enum(["low", "medium", "high"]).default("medium"),
  includeBenign: z.boolean().default(true),
});

export const generateTestsSchema = z.object({
  policyVersionId: z.string().min(1),
  count: z.number().int().min(1).max(500).optional().default(30),
});

export const evaluateSchema = z.object({
  policyVersionId: z.string().min(1),
  prompt: z.string().min(1).max(8000),
});

export const regressionSchema = z.object({
  baselineRunId: z.string().min(1),
  currentRunId: z.string().min(1),
});

export const recommendationsSchema = z.object({
  runId: z.string().min(1),
});
