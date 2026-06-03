import type { ConsumptionLogDto } from "./consumption-logs-contract";
import type { UsageType } from "./consumption-types";
import { usageLabel } from "./consumption-types";

export type AggregatedConsumptionRow = {
  key: string;
  materialId: string;
  materialName: string;
  materialGroup: string;
  usageType: UsageType;
  unit: string;
  totalQuantity: number;
  entryCount: number;
  lastOccurredAt: string;
};

export type AggregatedSection = {
  key: string;
  label: string;
  rows: AggregatedConsumptionRow[];
};

export type SummaryGroupMode = "list" | "usage" | "materialGroup";

/** Merge rows with the same material + usage; sum quantity. */
export function aggregateConsumptionLogs(
  logs: ConsumptionLogDto[],
): AggregatedConsumptionRow[] {
  const map = new Map<string, AggregatedConsumptionRow>();

  for (const log of logs) {
    const key = `${log.materialId}:${log.usageType}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQuantity += log.quantity;
      existing.entryCount += 1;
      if (Date.parse(log.occurredAt) > Date.parse(existing.lastOccurredAt)) {
        existing.lastOccurredAt = log.occurredAt;
      }
    } else {
      map.set(key, {
        key,
        materialId: log.materialId,
        materialName: log.materialName,
        materialGroup: log.materialGroup,
        usageType: log.usageType,
        unit: log.unit,
        totalQuantity: log.quantity,
        entryCount: 1,
        lastOccurredAt: log.occurredAt,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const qty = b.totalQuantity - a.totalQuantity;
    if (qty !== 0) return qty;
    return a.materialName.localeCompare(b.materialName, "zh-CN");
  });
}

export function groupAggregatedRows(
  rows: AggregatedConsumptionRow[],
  mode: SummaryGroupMode,
): AggregatedSection[] {
  if (mode === "list") {
    return [{ key: "all", label: "全部", rows }];
  }

  const map = new Map<string, AggregatedConsumptionRow[]>();
  for (const row of rows) {
    const sectionKey =
      mode === "usage" ? row.usageType : row.materialGroup || "未分组";
    const bucket = map.get(sectionKey) ?? [];
    bucket.push(row);
    map.set(sectionKey, bucket);
  }

  return [...map.entries()]
    .map(([key, sectionRows]) => ({
      key,
      label: mode === "usage" ? usageLabel(key as UsageType) : key,
      rows: sectionRows.sort((a, b) => b.totalQuantity - a.totalQuantity),
    }))
    .sort((a, b) => {
      const sumA = a.rows.reduce((s, r) => s + r.totalQuantity, 0);
      const sumB = b.rows.reduce((s, r) => s + r.totalQuantity, 0);
      return sumB - sumA;
    });
}

export function summaryStats(logs: ConsumptionLogDto[], rows: AggregatedConsumptionRow[]) {
  return {
    rawCount: logs.length,
    aggregatedCount: rows.length,
  };
}
