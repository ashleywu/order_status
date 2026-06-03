import { fetchAllRecords, type AirtableRecord } from "./airtable";
import { readNumericField } from "./airtable-field-value";
import type {
  ConsumptionLogDto,
  ConsumptionLogPeriod,
  ConsumptionLogsQuery,
} from "./consumption-logs-contract";
import { buildConsumptionLogsFormula } from "./consumption-logs-formula";
import type { UsageType } from "./consumption-types";
import type { MaterialDto } from "./materials-contract";
import { mapRecordToMaterialDto } from "./materials-map";

const USAGE_TYPES = new Set<UsageType>([
  "rd_lab",
  "product",
  "marketing",
  "workshop",
]);

function asOptionName(v: unknown): string {
  if (typeof v === "string") return v;
  if (
    v &&
    typeof v === "object" &&
    "name" in v &&
    typeof (v as { name: unknown }).name === "string"
  ) {
    return (v as { name: string }).name;
  }
  return "";
}

function firstLinkId(v: unknown): string | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const id = v[0];
  return typeof id === "string" ? id : null;
}

function asQuantity(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isVoided(fields: Record<string, unknown>): boolean {
  if (fields.voided === true) return true;
  if (fields.voided === "true") return true;
  return false;
}

function parsePeriod(raw: string | null | undefined): ConsumptionLogPeriod {
  if (raw === "week" || raw === "month") return raw;
  return "today";
}

function parseUsageType(raw: string | null | undefined): UsageType | undefined {
  if (raw && USAGE_TYPES.has(raw as UsageType)) return raw as UsageType;
  return undefined;
}

export function parseConsumptionLogsQuery(
  searchParams: URLSearchParams,
): ConsumptionLogsQuery {
  return {
    period: parsePeriod(searchParams.get("period")),
    usageType: parseUsageType(searchParams.get("usageType")),
    materialId: searchParams.get("materialId")?.trim() || undefined,
    materialGroup: searchParams.get("materialGroup")?.trim() || undefined,
  };
}

function materialMaps(records: AirtableRecord[]): {
  materials: Map<string, MaterialDto>;
  prices: Map<string, number | null>;
} {
  const materials = new Map<string, MaterialDto>();
  const prices = new Map<string, number | null>();
  for (const record of records) {
    const dto = mapRecordToMaterialDto(record);
    if (!dto) continue;
    materials.set(record.id, dto);
    prices.set(record.id, readNumericField(record.fields, "price"));
  }
  return { materials, prices };
}

function mapLogRecord(
  record: AirtableRecord,
  materials: Map<string, MaterialDto>,
  prices: Map<string, number | null>,
): ConsumptionLogDto | null {
  const { id, fields: f } = record;
  if (isVoided(f)) return null;

  const materialId = firstLinkId(f.material);
  if (!materialId) return null;

  const usageRaw = asOptionName(f.usage_type);
  if (!USAGE_TYPES.has(usageRaw as UsageType)) return null;

  const quantity = asQuantity(f.quantity);
  if (quantity === null || quantity <= 0) return null;

  const occurredRaw = f.occurred_at;
  const occurredAt =
    typeof occurredRaw === "string" && occurredRaw.trim()
      ? occurredRaw
      : record.createdTime ?? new Date().toISOString();

  const mat = materials.get(materialId);
  const unitPrice = prices.get(materialId) ?? null;
  const lineTotal =
    unitPrice !== null ? Math.round(quantity * unitPrice * 100) / 100 : null;

  return {
    id,
    materialId,
    materialName: mat?.buttonLabel || mat?.name || "（未命名）",
    materialGroup: mat?.group || "未分组",
    unit: mat?.unit || "—",
    usageType: usageRaw as UsageType,
    quantity,
    occurredAt,
    unitPrice,
    lineTotal,
  };
}

export async function listConsumptionLogs(input: {
  pat: string;
  baseId: string;
  consumptionTable: string;
  materialsTable: string;
  query: ConsumptionLogsQuery;
}): Promise<ConsumptionLogDto[]> {
  const period = input.query.period ?? "today";
  const formula = buildConsumptionLogsFormula({
    period,
    usageType: input.query.usageType,
    materialId: input.query.materialId,
  });

  const [logRecords, materialRecords] = await Promise.all([
    fetchAllRecords(
      input.pat,
      input.baseId,
      input.consumptionTable,
      formula,
    ),
    fetchAllRecords(
      input.pat,
      input.baseId,
      input.materialsTable,
      "TRUE()",
    ),
  ]);

  const { materials, prices } = materialMaps(materialRecords);

  let logs = logRecords
    .map((r) => mapLogRecord(r, materials, prices))
    .filter((r): r is ConsumptionLogDto => r !== null);

  if (input.query.materialGroup) {
    const group = input.query.materialGroup;
    logs = logs.filter((l) => l.materialGroup === group);
  }

  logs.sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );

  return logs;
}
