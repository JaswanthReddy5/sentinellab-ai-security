import { describe, it, expect } from "vitest";
import { parsePolicy, SAMPLE_POLICY_YAML, serializePolicy } from "../policy/parser";

describe("policy parser", () => {
  it("parses a valid YAML policy", () => {
    const result = parsePolicy(SAMPLE_POLICY_YAML);
    expect(result.ok).toBe(true);
    expect(result.document?.policy.name).toBe("prevent_customer_data_leak");
    expect(result.document?.rules?.length).toBeGreaterThan(0);
  });

  it("parses a valid JSON policy", () => {
    const doc = { policy: { name: "test_policy", version: "1.0" }, rules: [{ detect: "pii", action: "block" }] };
    const result = parsePolicy(JSON.stringify(doc));
    expect(result.ok).toBe(true);
    expect(result.format).toBe("json");
  });

  it("rejects a policy missing the policy.name field", () => {
    const result = parsePolicy("policy:\n  version: '1.0'\nrules: []\n");
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("rejects invalid detect types", () => {
    const result = parsePolicy("policy:\n  name: test\n  version: '1.0'\nrules:\n  - detect: not_a_real_type\n    action: block\n");
    expect(result.ok).toBe(false);
  });

  it("rejects malformed YAML with a syntax error", () => {
    const result = parsePolicy("policy: [this is not valid: yaml");
    expect(result.ok).toBe(false);
    expect(result.issues[0].message).toMatch(/error/i);
  });

  it("warns when a policy has no rules or tools", () => {
    const result = parsePolicy("policy:\n  name: empty_policy\n  version: '1.0'\n");
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBe(1);
  });

  it("round-trips serialize -> parse", () => {
    const parsed = parsePolicy(SAMPLE_POLICY_YAML);
    expect(parsed.document).toBeTruthy();
    const serialized = serializePolicy(parsed.document!, "yaml");
    const reparsed = parsePolicy(serialized);
    expect(reparsed.ok).toBe(true);
    expect(reparsed.document?.policy.name).toBe(parsed.document?.policy.name);
  });
});
