import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { jsonError, handleUnknownError } from "@/lib/apiUtils";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const store = getStore();
    const policy = await store.getPolicy(id);
    if (!policy) return jsonError("Policy not found", 404);
    return NextResponse.json({ policy });
  } catch (err) {
    return handleUnknownError(err);
  }
}
