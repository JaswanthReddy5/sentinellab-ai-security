import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data/store";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { runAttackLabSweep } from "@/lib/engine/runner";
import { attackCategoryKeys } from "@/lib/validation";
import { logger } from "@/lib/logger";

const attackLabSchema = z.object({
  policyVersionId: z.string().min(1),
  category: z.enum(attackCategoryKeys).nullable().optional().default(null),
  mutationLevel: z.enum(["low", "medium", "high"]).optional().default("high"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = attackLabSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const version = await store.getPolicyVersion(parsed.data.policyVersionId);
    if (!version) return jsonError("Policy version not found", 404);

    const result = runAttackLabSweep(version.document, parsed.data.category, parsed.data.mutationLevel);
    logger.info("attack_lab_sweep_completed", {
      policyVersionId: version.id,
      category: parsed.data.category ?? "all",
      generated: result.stats.generated,
      bypassed: result.stats.bypassed,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleUnknownError(err, "Failed to run attack lab sweep");
  }
}
