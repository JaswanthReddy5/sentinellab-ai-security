import type { EvalAction, ResultVerdict } from "../types";

/**
 * Expected vs Actual comparison (Feature H).
 *
 * PASS             expected === actual
 * CRITICAL_BYPASS  expected BLOCK, actual ALLOW  (an attack got through completely)
 * FALSE_POSITIVE   expected ALLOW, actual BLOCK  (a legitimate request got blocked)
 * REVIEW_MISMATCH  expected REVIEW, actual != REVIEW
 * FAIL             everything else (e.g. BLOCK expected but only flagged for REVIEW)
 */
export function computeVerdict(expected: EvalAction, actual: EvalAction): ResultVerdict {
  if (expected === actual) return "PASS";
  if (expected === "BLOCK" && actual === "ALLOW") return "CRITICAL_BYPASS";
  if (expected === "ALLOW" && actual === "BLOCK") return "FALSE_POSITIVE";
  if (expected === "REVIEW" && actual !== "REVIEW") return "REVIEW_MISMATCH";
  return "FAIL";
}
