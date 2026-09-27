import type { PolicyDocument, PolicyRule, TestResult } from "../types";

export type RuleDiffKind = "added" | "removed" | "changed" | "unchanged";

export interface RuleDiffEntry {
  kind: RuleDiffKind;
  detect: string;
  previous: PolicyRule | null;
  current: PolicyRule | null;
  /** Human-readable description of what changed, e.g. "action: block -> review". */
  description: string;
}

export interface ToolDiffEntry {
  tool: string;
  kind: RuleDiffKind;
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
  description: string;
}

export interface PolicyDiff {
  ruleDiffs: RuleDiffEntry[];
  toolDiffs: ToolDiffEntry[];
  hasChanges: boolean;
  summary: string[];
}

function describeRuleChange(prev: PolicyRule, cur: PolicyRule): string {
  const parts: string[] = [];
  if (prev.action !== cur.action) parts.push(`action: ${prev.action} → ${cur.action}`);
  if ((prev.severity ?? "—") !== (cur.severity ?? "—")) parts.push(`severity: ${prev.severity ?? "—"} → ${cur.severity ?? "—"}`);
  return parts.length ? parts.join(", ") : "no field change";
}

/**
 * Computes a structural diff between two policy documents' rule sets and
 * tool restrictions. This is a real diff over the parsed documents — not a
 * cosmetic string comparison — so it can be linked to which security tests
 * were actually affected by each change.
 */
export function diffPolicies(previous: PolicyDocument, current: PolicyDocument): PolicyDiff {
  const prevRules = new Map((previous.rules ?? []).map((r) => [r.detect, r]));
  const curRules = new Map((current.rules ?? []).map((r) => [r.detect, r]));
  const allDetectTypes = new Set([...prevRules.keys(), ...curRules.keys()]);

  const ruleDiffs: RuleDiffEntry[] = [];
  for (const detect of allDetectTypes) {
    const prev = prevRules.get(detect) ?? null;
    const cur = curRules.get(detect) ?? null;
    if (prev && !cur) {
      ruleDiffs.push({ kind: "removed", detect, previous: prev, current: null, description: `rule removed (was action: ${prev.action})` });
    } else if (!prev && cur) {
      ruleDiffs.push({ kind: "added", detect, previous: null, current: cur, description: `rule added (action: ${cur.action})` });
    } else if (prev && cur) {
      if (prev.action !== cur.action || (prev.severity ?? null) !== (cur.severity ?? null)) {
        ruleDiffs.push({ kind: "changed", detect, previous: prev, current: cur, description: describeRuleChange(prev, cur) });
      } else {
        ruleDiffs.push({ kind: "unchanged", detect, previous: prev, current: cur, description: "no change" });
      }
    }
  }
  ruleDiffs.sort((a, b) => {
    const rank: Record<RuleDiffKind, number> = { removed: 0, changed: 1, added: 2, unchanged: 3 };
    return rank[a.kind] - rank[b.kind];
  });

  const prevTools = previous.tools ?? {};
  const curTools = current.tools ?? {};
  const allTools = new Set([...Object.keys(prevTools), ...Object.keys(curTools)]);
  const toolDiffs: ToolDiffEntry[] = [];
  for (const tool of allTools) {
    const prev = prevTools[tool] as Record<string, unknown> | undefined;
    const cur = curTools[tool] as Record<string, unknown> | undefined;
    const prevStr = prev ? JSON.stringify(prev) : null;
    const curStr = cur ? JSON.stringify(cur) : null;
    if (prevStr === curStr) {
      toolDiffs.push({ tool, kind: "unchanged", previous: prev ?? null, current: cur ?? null, description: "no change" });
    } else if (prev && !cur) {
      toolDiffs.push({ tool, kind: "removed", previous: prev, current: null, description: "tool restriction removed" });
    } else if (!prev && cur) {
      toolDiffs.push({ tool, kind: "added", previous: null, current: cur, description: "tool restriction added" });
    } else {
      toolDiffs.push({ tool, kind: "changed", previous: prev ?? null, current: cur ?? null, description: "tool restriction changed" });
    }
  }

  const summary: string[] = [];
  for (const d of ruleDiffs) {
    if (d.kind === "removed") summary.push(`Removed rule: ${d.detect}`);
    else if (d.kind === "added") summary.push(`Added rule: ${d.detect}`);
    else if (d.kind === "changed") summary.push(`Changed ${d.detect}: ${d.description}`);
  }
  for (const d of toolDiffs) {
    if (d.kind !== "unchanged") summary.push(`Tool "${d.tool}": ${d.description}`);
  }

  return {
    ruleDiffs,
    toolDiffs,
    hasChanges: summary.length > 0,
    summary,
  };
}

export interface RuleImpact {
  detect: string;
  diffKind: RuleDiffKind;
  affectedTests: number;
  newlyFailing: number;
}

/**
 * Connects a policy rule change to its measured security effect by counting
 * how many shared test cases had that rule among their matched rules in each
 * run, and how many flipped from a passing verdict to a failing one.
 */
export function computeRuleImpact(diff: PolicyDiff, baselineResults: TestResult[], currentResults: TestResult[]): RuleImpact[] {
  const currentById = new Map(currentResults.map((r) => [r.testCaseId, r]));

  return diff.ruleDiffs
    .filter((d) => d.kind !== "unchanged")
    .map((d) => {
      let affected = 0;
      let newlyFailing = 0;
      for (const baseResult of baselineResults) {
        const touchedBaseline = baseResult.matchedRules.some((r) => r.startsWith(`${d.detect}→`) || r.startsWith(`${d.detect}.`));
        const curResult = currentById.get(baseResult.testCaseId);
        const touchedCurrent = curResult ? curResult.matchedRules.some((r) => r.startsWith(`${d.detect}→`) || r.startsWith(`${d.detect}.`)) : false;
        if (touchedBaseline || touchedCurrent) {
          affected += 1;
          const wasOk = baseResult.verdict === "PASS";
          const nowBad = curResult && curResult.verdict !== "PASS";
          if (wasOk && nowBad) newlyFailing += 1;
        }
      }
      return { detect: d.detect, diffKind: d.kind, affectedTests: affected, newlyFailing };
    });
}
