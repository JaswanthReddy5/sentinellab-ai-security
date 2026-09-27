import type { Policy, PolicyVersion, Recommendation, Regression, TestResult, TestRun } from "../types";
import type { CreatePolicyInput, DataStore } from "./types";
import { buildSeedBundle } from "./seedData";
import { parsePolicy } from "../policy/parser";
import { shortId } from "../rng";
import { logger } from "../logger";

interface MemoryState {
  policies: Map<string, Policy>;
  runs: Map<string, TestRun>;
  resultsByRun: Map<string, TestResult[]>;
  regressions: Regression[];
  recommendations: Recommendation[];
}

// A module-level singleton keeps state for the lifetime of the server
// process (or warm serverless instance). This is sufficient for demo
// purposes; see README "Limitations" for the durability tradeoff, and
// PrismaStore for the fully persistent path once DATABASE_URL is set.
declare global {
  var __sentinelMemoryState: MemoryState | undefined;
}

function initState(): MemoryState {
  const seed = buildSeedBundle();
  const policies = new Map(seed.policies.map((p) => [p.id, p]));
  const runs = new Map(seed.runs.map((r) => [r.id, r]));
  const resultsByRun = new Map(Object.entries(seed.resultsByRun));
  return {
    policies,
    runs,
    resultsByRun,
    regressions: [...seed.regressions],
    recommendations: [...seed.recommendations],
  };
}

function getState(): MemoryState {
  if (!global.__sentinelMemoryState) {
    global.__sentinelMemoryState = initState();
    logger.info("memory_store_initialized", { policies: global.__sentinelMemoryState.policies.size, runs: global.__sentinelMemoryState.runs.size });
  }
  return global.__sentinelMemoryState;
}

export class MemoryStore implements DataStore {
  kind = "memory" as const;

  async listPolicies(): Promise<Policy[]> {
    return [...getState().policies.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getPolicy(id: string): Promise<Policy | null> {
    return getState().policies.get(id) ?? null;
  }

  async getPolicyBySlug(slug: string): Promise<Policy | null> {
    return [...getState().policies.values()].find((p) => p.slug === slug) ?? null;
  }

  async createPolicy(input: CreatePolicyInput): Promise<Policy> {
    const parsed = parsePolicy(input.raw);
    if (!parsed.ok || !parsed.document) {
      throw new Error(parsed.issues.map((i) => i.message).join("; "));
    }
    const state = getState();
    const id = shortId("policy", `${parsed.document.policy.name}:${Date.now()}:${Math.random()}`);
    const now = new Date().toISOString();
    const versionId = shortId("pv", `${id}:v1`);
    const version: PolicyVersion = {
      id: versionId,
      policyId: id,
      label: `v${parsed.document.policy.version}`,
      document: parsed.document,
      raw: input.raw,
      format: input.format,
      createdAt: now,
      isActive: true,
    };
    const policy: Policy = {
      id,
      name: parsed.document.policy.name,
      slug: parsed.document.policy.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: parsed.document.policy.description ?? "",
      status: "active",
      createdAt: now,
      updatedAt: now,
      versions: [version],
    };
    state.policies.set(id, policy);
    logger.info("policy_created", { policyId: id, name: policy.name });
    return policy;
  }

  async addPolicyVersion(policyId: string, input: CreatePolicyInput): Promise<PolicyVersion> {
    const parsed = parsePolicy(input.raw);
    if (!parsed.ok || !parsed.document) {
      throw new Error(parsed.issues.map((i) => i.message).join("; "));
    }
    const state = getState();
    const policy = state.policies.get(policyId);
    if (!policy) throw new Error("Policy not found");

    const now = new Date().toISOString();
    const versionId = shortId("pv", `${policyId}:${policy.versions.length + 1}:${Date.now()}`);
    for (const v of policy.versions) v.isActive = false;
    const version: PolicyVersion = {
      id: versionId,
      policyId,
      label: `v${parsed.document.policy.version}`,
      document: parsed.document,
      raw: input.raw,
      format: input.format,
      createdAt: now,
      isActive: true,
    };
    policy.versions.push(version);
    policy.updatedAt = now;
    logger.info("policy_version_added", { policyId, versionId, label: version.label });
    return version;
  }

  async getPolicyVersion(id: string): Promise<PolicyVersion | null> {
    for (const policy of getState().policies.values()) {
      const v = policy.versions.find((v) => v.id === id);
      if (v) return v;
    }
    return null;
  }

  async listRuns(): Promise<TestRun[]> {
    return [...getState().runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRun(id: string): Promise<TestRun | null> {
    return getState().runs.get(id) ?? null;
  }

  async getRunResults(id: string): Promise<TestResult[]> {
    return getState().resultsByRun.get(id) ?? [];
  }

  async createRun(run: TestRun, results: TestResult[]): Promise<void> {
    const state = getState();
    state.runs.set(run.id, run);
    state.resultsByRun.set(run.id, results);
    logger.info("test_run_created", { runId: run.id, policyId: run.policyId, totalTests: run.stats.totalTests });
  }

  async listRegressions(): Promise<Regression[]> {
    return [...getState().regressions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRegression(id: string): Promise<Regression | null> {
    return getState().regressions.find((r) => r.id === id) ?? null;
  }

  async saveRegression(regression: Regression): Promise<void> {
    getState().regressions.push(regression);
    logger.info("regression_calculated", { regressionId: regression.id, isRegression: regression.isRegression, changePoints: regression.changePoints });
  }

  async listRecommendations(runId?: string): Promise<Recommendation[]> {
    const all = getState().recommendations;
    return runId ? all.filter((r) => r.runId === runId) : all;
  }

  async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
    getState().recommendations.push(...recommendations);
  }
}
