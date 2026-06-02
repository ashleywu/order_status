import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPasscode,
} from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { assertLoginAllowed, getLoginClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    getEnv();
  } catch (err) {
    console.error("[env]", err);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const ip = getLoginClientKey(request);
  const limit = assertLoginAllowed(ip);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const passcode =
    typeof body === "object" &&
    body !== null &&
    "passcode" in body &&
    typeof (body as { passcode?: unknown }).passcode === "string"
      ? (body as { passcode: string }).passcode
      : undefined;

  if (!passcode) {
    return NextResponse.json({ error: "Missing passcode" }, { status: 400 });
  }

  const ok = await verifyPasscode(passcode);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getEnv();
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: env.isProduction,
  });
  return res;
}
