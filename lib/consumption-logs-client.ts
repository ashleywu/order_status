import { handleSessionExpired } from "./auth-unauthorized";
import type {
  ConsumptionLogsPayload,
  ConsumptionLogsQuery,
} from "./consumption-logs-contract";
import type { UsageType } from "./consumption-types";

function toQueryString(query: ConsumptionLogsQuery): string {
  const params = new URLSearchParams();
  if (query.period) params.set("period", query.period);
  if (query.usageType) params.set("usageType", query.usageType);
  if (query.materialId) params.set("materialId", query.materialId);
  if (query.materialGroup) params.set("materialGroup", query.materialGroup);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function fetchConsumptionLogs(
  query: ConsumptionLogsQuery = {},
): Promise<ConsumptionLogsPayload> {
  const res = await fetch(`/api/consumption/logs${toQueryString(query)}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `请求失败 (${res.status})`);
  }

  return (await res.json()) as ConsumptionLogsPayload;
}

export type { UsageType };
