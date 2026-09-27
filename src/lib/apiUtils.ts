import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function zodError(error: ZodError) {
  return jsonError(
    "Validation failed",
    422,
    error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
  );
}

export function handleUnknownError(err: unknown, fallback = "Internal server error") {
  const message = err instanceof Error ? err.message : fallback;
  return jsonError(message, 500);
}
