import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { regressionSchema } from "@/lib/validation";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";
import { computeRegression } from "@/lib/engine/regression";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const store = getStore();
    const regressions = await store.listRegressions();
    return NextResponse.json({ regressions });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = regressionSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const [baselineRun, currentRun] = await Promise.all([
      store.getRun(parsed.data.baselineRunId),
      store.getRun(parsed.data.currentRunId),
    ]);
    if (!baselineRun) return jsonError("Baseline run not found", 404);
    if (!currentRun) return jsonError("Current run not found", 404);

    const [baselineResults, currentResults] = await Promise.all([
      store.getRunResults(baselineRun.id),
      store.getRunResults(currentRun.id),
    ]);

    const regression = computeRegression({ baselineRun, baselineResults, currentRun, currentResults });
    await store.saveRegression(regression);
    logger.info("regression_calculation_completed", { regressionId: regression.id, isRegression: regression.isRegression });

    return NextResponse.json({ regression }, { status: 201 });
  } catch (err) {
    return handleUnknownError(err, "Failed to compute regression");
  }
}
