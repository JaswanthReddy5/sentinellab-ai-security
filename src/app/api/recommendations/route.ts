import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { recommendationsSchema } from "@/lib/validation";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { generateRecommendations } from "@/lib/engine/recommend";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId") ?? undefined;
    const store = getStore();
    const recommendations = await store.listRecommendations(runId);
    return NextResponse.json({ recommendations });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = recommendationsSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const run = await store.getRun(parsed.data.runId);
    if (!run) return jsonError("Run not found", 404);
    const results = await store.getRunResults(run.id);

    const recommendations = generateRecommendations(run.id, run.policyName, results);
    await store.saveRecommendations(recommendations);
    return NextResponse.json({ recommendations }, { status: 201 });
  } catch (err) {
    return handleUnknownError(err, "Failed to generate recommendations");
  }
}
