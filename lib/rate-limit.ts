/** IP-based in-memory sliding window for POST /api/login — OK for MVP; multi-instance uses separate Maps (plan §5.3). */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type Entry = number[];

const store = new Map<string, Entry>();

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export function assertLoginAllowed(clientKey: string): { ok: true } | { ok: false } {
  const now = Date.now();
  const raw = store.get(clientKey) ?? [];
  let timestamps = prune(raw, now);
  if (timestamps.length >= MAX_ATTEMPTS) {
    return { ok: false };
  }
  timestamps = [...timestamps, now];
  store.set(clientKey, timestamps);
  return { ok: true };
}

export function getLoginClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
