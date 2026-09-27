import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { jsonError, handleUnknownError } from "@/lib/apiUtils";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const store = getStore();
    const regression = await store.getRegression(id);
    if (!regression) return jsonError("Regression not found", 404);

    const [baselineResults, currentResults] = await Promise.all([
      store.getRunResults(regression.baselineRunId),
      store.getRunResults(regression.currentRunId),
    ]);

    return NextResponse.json({ regression, baselineResults, currentResults });
  } catch (err) {
    return handleUnknownError(err);
  }
}
