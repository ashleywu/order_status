import type { UsageType } from "./consumption-types";
import { escapeAirtableFormulaString } from "./airtable-formula";
import type { ConsumptionLogPeriod } from "./consumption-logs-contract";

function periodClause(period: ConsumptionLogPeriod): string {
  switch (period) {
    case "today":
      return `IS_SAME({occurred_at}, TODAY(), 'day')`;
    case "week":
      return `IS_SAME({occurred_at}, TODAY(), 'week')`;
    case "month":
      return `IS_SAME({occurred_at}, TODAY(), 'month')`;
  }
}

/** Airtable filterByFormula for Consumption_logs list reads. */
export function buildConsumptionLogsFormula(input: {
  period: ConsumptionLogPeriod;
  usageType?: UsageType;
  materialId?: string;
}): string {
  const parts = [periodClause(input.period)];

  if (input.usageType) {
    parts.push(
      `{usage_type}="${escapeAirtableFormulaString(input.usageType)}"`,
    );
  }

  if (input.materialId) {
    parts.push(
      `{material}="${escapeAirtableFormulaString(input.materialId)}"`,
    );
  }

  return parts.length === 1 ? parts[0]! : `AND(${parts.join(", ")})`;
}
