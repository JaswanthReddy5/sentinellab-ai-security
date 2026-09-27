// Core domain types for SentinelLab's security regression engine.
// These mirror the Prisma schema shapes so the in-memory demo store and the
// Postgres-backed store can be swapped behind the same DataStore interface.

export type PolicyAction = "block" | "review" | "allow";
export type EvalAction = "ALLOW" | "BLOCK" | "REVIEW";
export type Severity = "low" | "medium" | "high" | "critical";

export type AttackCategoryKey =
  | "direct_prompt_injection"
  | "indirect_prompt_injection"
  | "jailbreak"
  | "sensitive_data_extraction"
  | "pii_leakage"
  | "credential_exposure"
  | "tool_abuse"
  | "privilege_escalation"
  | "data_exfiltration"
  | "excessive_agency"
  | "malicious_document_injection"
  | "policy_evasion";

export interface AttackCategoryInfo {
  key: AttackCategoryKey;
  label: string;
  description: string;
}

export type MutationType =
  | "direct_rephrasing"
  | "roleplay_framing"
  | "instruction_hierarchy_manipulation"
  | "obfuscation"
  | "unicode_variation"
  | "encoded_payload"
  | "multi_step_instructions"
  | "indirect_injection"
  | "retrieved_document_injection"
  | "tool_use_manipulation"
  | "context_switching"
  | "social_engineering";

export type DetectType =
  | "pii"
  | "confidential_data"
  | "credentials"
  | "secrets"
  | "prompt_injection"
  | "jailbreak"
  | "tool_abuse"
  | "data_exfiltration"
  | "privilege_escalation"
  | "excessive_agency"
  | "malicious_document"
  | "policy_evasion";

export interface PolicyRule {
  detect: DetectType;
  action: PolicyAction;
  severity?: Severity;
}

export interface ToolPolicy {
  allowed?: string[]; // keywords like "internal_domains"
  blocked?: string[]; // keywords like "external_domains"
  allowed_domains?: string[];
  blocked_domains?: string[];
}

export interface PolicyDocument {
  policy: {
    name: string;
    version: string;
    description?: string;
  };
  rules?: PolicyRule[];
  tools?: Record<string, ToolPolicy>;
}

export type PolicyStatus = "active" | "draft" | "archived";

export interface Policy {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
  versions: PolicyVersion[];
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  label: string; // v1, v2, v2.4
  document: PolicyDocument;
  raw: string; // original YAML/JSON text
  format: "yaml" | "json";
  createdAt: string;
  isActive: boolean;
}

export type TestSource = "policy_generated" | "attack_mutation" | "benign";
export type TestCategory = "positive" | "negative" | "boundary" | "benign";

export interface SecurityTestCase {
  id: string;
  runId: string;
  source: TestSource;
  category: TestCategory;
  attackCategory: AttackCategoryKey | null;
  mutationType: MutationType | null;
  seed: string | null;
  prompt: string;
  expectedAction: EvalAction;
  reason: string;
  severity: Severity;
}

export type ResultVerdict =
  | "PASS"
  | "FAIL"
  | "CRITICAL_BYPASS"
  | "FALSE_POSITIVE"
  | "REVIEW_MISMATCH";

export interface EvaluationOutcome {
  action: EvalAction;
  matchedRules: string[];
  missingDetections: string[];
  confidence: number;
  severity: Severity;
  reason: string;
}

export interface TestResult {
  id: string;
  runId: string;
  testCaseId: string;
  testCase: SecurityTestCase;
  actualAction: EvalAction;
  matchedRules: string[];
  missingDetections: string[];
  confidence: number;
  verdict: ResultVerdict;
}

export interface TestRunConfig {
  policyVersionId: string;
  testCount: number;
  categories: AttackCategoryKey[];
  mutationLevel: "low" | "medium" | "high";
  includeBenign: boolean;
}

export interface TestRunStats {
  totalTests: number;
  passed: number;
  failed: number;
  criticalBypasses: number;
  falsePositives: number;
  reviewMismatches: number;
  attacksTotal: number;
  attacksBlocked: number;
  securityCoverage: number; // percentage
  falsePositiveRate: number; // percentage
  attackDetectionRate: number; // percentage (alias of coverage on attack subset)
  confidence: number; // avg confidence
}

export interface TestRun {
  id: string;
  label: string;
  policyId: string;
  policyName: string;
  policyVersionId: string;
  policyVersionLabel: string;
  config: TestRunConfig;
  stats: TestRunStats;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
}

export interface CategoryBreakdownEntry {
  category: AttackCategoryKey;
  total: number;
  blocked: number;
  coverage: number;
}

export interface RegressionBypass {
  testCaseId: string;
  prompt: string;
  attackCategory: AttackCategoryKey | null;
  mutationType: MutationType | null;
  severity: Severity;
  previousAction: EvalAction;
  currentAction: EvalAction;
}

export interface Regression {
  id: string;
  baselineRunId: string;
  currentRunId: string;
  baselineLabel: string;
  currentLabel: string;
  previousCoverage: number;
  currentCoverage: number;
  changePoints: number;
  newBypassCount: number;
  newBypasses: RegressionBypass[];
  categoryComparison: Array<{
    category: AttackCategoryKey;
    baseline: number;
    current: number;
    delta: number;
  }>;
  isRegression: boolean;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  runId: string;
  category: AttackCategoryKey | null;
  severity: Severity;
  problem: string;
  recommendation: string;
  policySnippet: string;
  createdAt: string;
}

export interface DashboardSummary {
  securityCoverage: number;
  attackDetection: { blocked: number; total: number };
  falsePositiveRate: number;
  securityRegressions: number;
  criticalBypasses: number;
  testCases: number;
  policyVersion: string;
  coverageTrend: Array<{ label: string; coverage: number; date: string }>;
  falsePositiveTrend: Array<{ label: string; rate: number; date: string }>;
  categoryPerformance: Array<{ category: AttackCategoryKey; coverage: number }>;
  regressionTrend: Array<{ label: string; regressions: number }>;
  recentRuns: TestRun[];
}
