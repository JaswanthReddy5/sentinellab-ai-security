import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { createPolicySchema } from "@/lib/validation";
import { jsonError, zodError, handleUnknownError } from "@/lib/apiUtils";

export async function GET() {
  try {
    const store = getStore();
    const policies = await store.listPolicies();
    return NextResponse.json({ policies });
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Request body must be JSON", 400);

    const parsed = createPolicySchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const store = getStore();
    const policy = await store.createPolicy(parsed.data);
    return NextResponse.json({ policy }, { status: 201 });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to create policy", 400);
  }
}
