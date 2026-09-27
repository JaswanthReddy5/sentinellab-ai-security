import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { createPolicySchema } from "@/lib/validation";
import { jsonError, zodError } from "@/lib/apiUtils";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);
    const parsed = createPolicySchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const version = await store.addPolicyVersion(id, parsed.data);
    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to add policy version", 400);
  }
}
