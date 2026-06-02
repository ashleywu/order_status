import type { DraftConsumption } from "./consumption-types";

export const CLIENT_REQUEST_ID_KEY = "consumption:m5:client-request-id";
export const CLIENT_REQUEST_DRAFT_KEY_KEY = "consumption:m5:client-request-draft-key";

export function buildClientRequestDraftKey(draft: DraftConsumption): string | null {
  const { materialId, usageType, quantity } = draft;
  if (!materialId || !usageType || quantity === undefined) return null;
  return `${materialId}|${usageType}|${quantity}`;
}

export function readClientRequestId(): {
  id: string | null;
  draftKey: string | null;
} {
  if (typeof window === "undefined") return { id: null, draftKey: null };
  return {
    id: sessionStorage.getItem(CLIENT_REQUEST_ID_KEY),
    draftKey: sessionStorage.getItem(CLIENT_REQUEST_DRAFT_KEY_KEY),
  };
}

export function clearClientRequestIdStorage(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CLIENT_REQUEST_ID_KEY);
  sessionStorage.removeItem(CLIENT_REQUEST_DRAFT_KEY_KEY);
}

function writeClientRequestId(id: string, draftKey: string): void {
  sessionStorage.setItem(CLIENT_REQUEST_ID_KEY, id);
  sessionStorage.setItem(CLIENT_REQUEST_DRAFT_KEY_KEY, draftKey);
}

/**
 * M5 §7.3 — call only when entering Review (draft complete).
 * Reuses id when draftKey unchanged; regenerates when draft triple changes.
 */
export function ensureClientRequestId(draft: DraftConsumption): string | null {
  const draftKey = buildClientRequestDraftKey(draft);
  if (!draftKey) return null;

  const stored = readClientRequestId();
  if (stored.id && stored.draftKey === draftKey) {
    return stored.id;
  }

  const id = crypto.randomUUID();
  writeClientRequestId(id, draftKey);
  return id;
}
