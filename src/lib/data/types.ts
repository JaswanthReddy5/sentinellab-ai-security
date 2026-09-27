import type {
  Policy,
  PolicyVersion,
  Recommendation,
  Regression,
  TestResult,
  TestRun,
} from "../types";

export interface CreatePolicyInput {
  raw: string;
  format: "yaml" | "json";
}

export interface DataStore {
  kind: "memory" | "prisma";

  listPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | null>;
  getPolicyBySlug(slug: string): Promise<Policy | null>;
  createPolicy(input: CreatePolicyInput): Promise<Policy>;
  addPolicyVersion(policyId: string, input: CreatePolicyInput): Promise<PolicyVersion>;
  getPolicyVersion(id: string): Promise<PolicyVersion | null>;

  listRuns(): Promise<TestRun[]>;
  getRun(id: string): Promise<TestRun | null>;
  getRunResults(id: string): Promise<TestResult[]>;
  createRun(run: TestRun, results: TestResult[]): Promise<void>;

  listRegressions(): Promise<Regression[]>;
  getRegression(id: string): Promise<Regression | null>;
  saveRegression(regression: Regression): Promise<void>;

  listRecommendations(runId?: string): Promise<Recommendation[]>;
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
}
