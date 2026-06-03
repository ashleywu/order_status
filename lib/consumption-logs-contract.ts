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
  /** Materials 表单价；无价格字段或未填时为 null */
  unitPrice: number | null;
  /** quantity × unitPrice；无单价时为 null */
  lineTotal: number | null;
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
