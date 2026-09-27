import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { handleUnknownError } from "@/lib/apiUtils";

export async function GET() {
  try {
    const store = getStore();
    const runs = await store.listRuns();
    return NextResponse.json({ runs });
  } catch (err) {
    return handleUnknownError(err);
  }
}
