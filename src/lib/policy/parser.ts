import * as yaml from "js-yaml";
import { policyDocumentSchema, policyHasAnyDetection } from "./schema";
import type { PolicyDocument } from "../types";

export interface ParseIssue {
  path: string;
  message: string;
}

export interface ParseResult {
  ok: boolean;
  format: "yaml" | "json";
  document: PolicyDocument | null;
  issues: ParseIssue[];
  warnings: ParseIssue[];
}

function detectFormat(raw: string): "yaml" | "json" {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "yaml";
}

export function parsePolicy(raw: string): ParseResult {
  const format = detectFormat(raw);
  let parsedUnknown: unknown;

  try {
    parsedUnknown = format === "json" ? JSON.parse(raw) : yaml.load(raw);
  } catch (err) {
    return {
      ok: false,
      format,
      document: null,
      issues: [
        {
          path: "root",
          message: err instanceof Error ? `Syntax error: ${err.message}` : "Unable to parse document",
        },
      ],
      warnings: [],
    };
  }

  if (!parsedUnknown || typeof parsedUnknown !== "object") {
    return {
      ok: false,
      format,
      document: null,
      issues: [{ path: "root", message: "Policy document must be an object with a top-level `policy` key." }],
      warnings: [],
    };
  }

  const result = policyDocumentSchema.safeParse(parsedUnknown);

  if (!result.success) {
    const issues: ParseIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "root",
      message: issue.message,
    }));
    return { ok: false, format, document: null, issues, warnings: [] };
  }

  const warnings: ParseIssue[] = [];
  if (!policyHasAnyDetection(result.data)) {
    warnings.push({
      path: "rules",
      message: "This policy defines no rules or tool restrictions — every request will be ALLOWED.",
    });
  }

  return {
    ok: true,
    format,
    document: result.data as PolicyDocument,
    issues: [],
    warnings,
  };
}

export function serializePolicy(doc: PolicyDocument, format: "yaml" | "json" = "yaml"): string {
  if (format === "json") return JSON.stringify(doc, null, 2);
  return yaml.dump(doc, { noRefs: true, lineWidth: 100 });
}

export const SAMPLE_POLICY_YAML = `policy:
  name: prevent_customer_data_leak
  version: "1.0"
  description: Blocks leakage of PII, confidential data, and credentials.

rules:
  - detect: pii
    action: block
    severity: high

  - detect: confidential_data
    action: block
    severity: critical

  - detect: credentials
    action: block
    severity: critical

  - detect: prompt_injection
    action: block
    severity: high

  - detect: data_exfiltration
    action: review
    severity: high

tools:
  send_email:
    allowed:
      - internal_domains
    blocked:
      - external_domains
`;
