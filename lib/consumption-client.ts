import type { UsageType } from "./consumption-types";
import { handleSessionExpired, isUnauthorizedError } from "./auth-unauthorized";

export type PostConsumptionPayload = {
  materialId: string;
  usageType: UsageType;
  quantity: number;
  clientRequestId: string;
  occurredAt?: string;
};

export type PostConsumptionSuccess = {
  ok: true;
  recordId: string;
  idempotentReplay: boolean;
  voided: boolean;
};

export type PostConsumptionFailure = {
  ok: false;
  error: string;
};

export async function postConsumption(
  payload: PostConsumptionPayload,
): Promise<PostConsumptionSuccess> {
  const res = await fetch("/api/consumption", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Unauthorized");
  }

  const data = (await res.json().catch(() => ({}))) as
    | PostConsumptionSuccess
    | PostConsumptionFailure;

  if (!res.ok || !("ok" in data) || data.ok !== true) {
    const err = new Error(
      "error" in data && typeof data.error === "string" ? data.error : "submit_failed",
    ) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = "error" in data && typeof data.error === "string" ? data.error : undefined;
    throw err;
  }

  return data;
}

export async function voidConsumption(
  recordId: string,
  reason = "user_undo",
): Promise<{ ok: true; recordId: string }> {
  const res = await fetch(`/api/consumption/${encodeURIComponent(recordId)}/void`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Unauthorized");
  }

  const data = (await res.json().catch(() => ({}))) as
    | { ok: true; recordId: string }
    | { ok: false; error: string };

  if (!res.ok || !("ok" in data) || data.ok !== true) {
    const err = new Error(
      "error" in data && typeof data.error === "string" ? data.error : "void_failed",
    ) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = "error" in data && typeof data.error === "string" ? data.error : undefined;
    throw err;
  }

  return data;
}

export { isUnauthorizedError };
