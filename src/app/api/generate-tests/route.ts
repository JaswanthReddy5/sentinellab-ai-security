import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { generateTestsSchema } from "@/lib/validation";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { generateTestsFromPolicy } from "@/lib/engine/generateTests";
import { evaluatePolicy } from "@/lib/engine/evaluate";
import { computeVerdict } from "@/lib/engine/compare";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = generateTestsSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const version = await store.getPolicyVersion(parsed.data.policyVersionId);
    if (!version) return jsonError("Policy version not found", 404);

    const generated = generateTestsFromPolicy(version.document, `preview:${version.id}`).slice(0, parsed.data.count);
    const withOutcome = generated.map((t) => {
      const outcome = evaluatePolicy(version.document, t.prompt);
      return { ...t, actualAction: outcome.action, verdict: computeVerdict(t.expectedAction, outcome.action), confidence: outcome.confidence };
    });

    logger.info("test_generation_completed", { policyVersionId: version.id, count: withOutcome.length });
    return NextResponse.json({ tests: withOutcome });
  } catch (err) {
    return handleUnknownError(err, "Failed to generate tests");
  }
}
