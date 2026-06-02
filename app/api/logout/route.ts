import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getEnv } from "@/lib/env";

export async function POST() {
  let isProduction = false;
  try {
    isProduction = getEnv().isProduction;
  } catch {
    isProduction = process.env.NODE_ENV === "production";
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });
  return res;
}
