import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { jsonError, handleUnknownError } from "@/lib/apiUtils";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const store = getStore();
    const run = await store.getRun(id);
    if (!run) return jsonError("Test run not found", 404);
    const results = await store.getRunResults(id);
    const recommendations = await store.listRecommendations(id);
    return NextResponse.json({ run, results, recommendations });
  } catch (err) {
    return handleUnknownError(err);
  }
}
