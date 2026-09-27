import { NextResponse } from "next/server";
import { buildDashboardSummary } from "@/lib/dashboardData";
import { handleUnknownError } from "@/lib/apiUtils";

export async function GET() {
  try {
    const summary = await buildDashboardSummary();
    return NextResponse.json(summary);
  } catch (err) {
    return handleUnknownError(err);
  }
}
