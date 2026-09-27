import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { evaluateSchema } from "@/lib/validation";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { evaluatePolicy } from "@/lib/engine/evaluate";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = evaluateSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const version = await store.getPolicyVersion(parsed.data.policyVersionId);
    if (!version) return jsonError("Policy version not found", 404);

    const outcome = evaluatePolicy(version.document, parsed.data.prompt);
    return NextResponse.json({ outcome });
  } catch (err) {
    return handleUnknownError(err, "Failed to evaluate prompt");
  }
}
