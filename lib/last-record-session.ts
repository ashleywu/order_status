/** M5 §5.4 — session-scoped Undo target; not guaranteed after refresh. */
export const LAST_RECORD_STORAGE_KEY = "consumption:m5:last-record-id";

export function readLastRecordId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(LAST_RECORD_STORAGE_KEY);
}

export function setLastRecordId(recordId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LAST_RECORD_STORAGE_KEY, recordId);
}

export function clearLastRecordId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LAST_RECORD_STORAGE_KEY);
}
