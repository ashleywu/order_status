import { clearClientRequestIdStorage } from "./client-request-id";
import { clearMaterialsCache } from "./materials-client";
import { clearDraftStorage } from "./draft-storage";
import { clearLastRecordId } from "./last-record-session";

/** M4/M5 — 401: clear draft, clientRequestId (+ draftKey), lastRecordId, materials cache → login. */
export function handleSessionExpired(): void {
  clearMaterialsCache();
  clearDraftStorage();
  clearClientRequestIdStorage();
  clearLastRecordId();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export function isUnauthorizedError(e: unknown): boolean {
  return (e as Error & { status?: number }).status === 401;
}
