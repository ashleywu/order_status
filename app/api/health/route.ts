import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth-api";

/** Protected health check — unauthenticated callers receive 401. */
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  return NextResponse.json({ ok: true });
}
