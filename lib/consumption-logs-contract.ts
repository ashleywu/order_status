import type { UsageType } from "./consumption-types";

export type ConsumptionLogPeriod = "today" | "week" | "month";

export type ConsumptionLogDto = {
  id: string;
  materialId: string;
  materialName: string;
  materialGroup: string;
  unit: string;
  usageType: UsageType;
  quantity: number;
  occurredAt: string;
};

export type ConsumptionLogsPayload = {
  logs: ConsumptionLogDto[];
  period: ConsumptionLogPeriod;
  generatedAt: string;
};

export type ConsumptionLogsQuery = {
  period?: ConsumptionLogPeriod;
  usageType?: UsageType;
  materialId?: string;
  materialGroup?: string;
};
