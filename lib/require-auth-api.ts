import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth";

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Route Handlers：无/无效会话 → 401。（[M2.md](M2.md)/[M3.md](M3.md) 文档名 `requireAuth`） */
export async function requireAuthCookies(): Promise<NextResponse | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return unauthorizedResponse();
  const payload = await verifySessionToken(token);
  if (!payload) return unauthorizedResponse();
  return null;
}

/** @alias {@link requireAuthCookies} — 与里程碑文档门禁命名一致 */
export const requireAuth = requireAuthCookies;
