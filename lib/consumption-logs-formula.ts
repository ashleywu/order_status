import type { UsageType } from "./consumption-types";
import { escapeAirtableFormulaString } from "./airtable-formula";
import type { ConsumptionLogPeriod } from "./consumption-logs-contract";

function periodClause(
  period: ConsumptionLogPeriod,
  occurredAtField: string,
): string {
  switch (period) {
    case "today":
      return `IS_SAME({${occurredAtField}}, TODAY(), 'day')`;
    case "week":
      return `IS_SAME({${occurredAtField}}, TODAY(), 'week')`;
    case "month":
      return `IS_SAME({${occurredAtField}}, TODAY(), 'month')`;
  }
}

/** Airtable filterByFormula for Consumption_logs list reads. */
export function buildConsumptionLogsFormula(input: {
  period: ConsumptionLogPeriod;
  usageType?: UsageType;
  materialId?: string;
  fieldNames?: {
    occurredAt?: string;
    usageType?: string;
    material?: string;
  };
}): string {
  const occurredAtField = input.fieldNames?.occurredAt ?? "occurred_at";
  const usageTypeField = input.fieldNames?.usageType ?? "usage_type";
  const materialField = input.fieldNames?.material ?? "material";

  const parts = [periodClause(input.period, occurredAtField)];

  if (input.usageType) {
    parts.push(
      `{${usageTypeField}}="${escapeAirtableFormulaString(input.usageType)}"`,
    );
  }

  if (input.materialId) {
    parts.push(
      `{${materialField}}="${escapeAirtableFormulaString(input.materialId)}"`,
    );
  }

  return parts.length === 1 ? parts[0]! : `AND(${parts.join(", ")})`;
}
