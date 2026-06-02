import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { getEnv } from "./env";

export const SESSION_COOKIE_NAME = "lab_session";

/** Matches JWT `sessionVersion` claim — bump to invalidate all sessions. */
export const SESSION_VERSION = 1;

/** Max-Age aligned with plan / M2: long-lived (~180 days). */
export const SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function createSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    authenticated: true as const,
    sessionVersion: SESSION_VERSION,
    sub: "lab-consumer",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .sign(getSecretKey());

  return token;
}

export async function verifySessionToken(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.authenticated !== true) return null;
    if (payload.sessionVersion !== SESSION_VERSION) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyPasscode(plain: string): Promise<boolean> {
  const env = getEnv();
  const hash = env.APP_PASSCODE_HASH?.trim();
  if (env.isProduction) {
    if (!hash) return false;
    return bcrypt.compare(plain, hash);
  }
  if (hash) return bcrypt.compare(plain, hash);
  const plainPass = env.APP_PASSCODE ?? "";
  return plain.length > 0 && plain === plainPass;
}
