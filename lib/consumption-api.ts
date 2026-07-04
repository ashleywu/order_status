import type { UsageType } from "./consumption-types";
import { isUsageType } from "./consumption-types";
import {
  formatOccurredAtForAirtable,
  resolveConsumptionWriteKeys,
  resolveTableFieldName,
  resolveTableFieldType,
} from "./airtable-field-names";
import {
  AirtableHttpError,
  createRecord,
  findConsumptionByClientRequestId,
  getRecord,
  isRecordVoided,
  patchRecord,
  type AirtableRecord,
} from "./airtable";
import { getIdempotencyLookupDays } from "./env";
import { normalizeDefaultIncrement } from "./quantity-defaults";

const CANONICAL_CATEGORY = new Set([
  "ingredient",
  "bottle",
  "label",
  "ribbon",
  "packaging",
]);

const AIRTABLE_RECORD_ID = /^rec[a-zA-Z0-9]{14,}$/;

export type ConsumptionPostBody = {
  materialId: string;
  usageType: UsageType;
  quantity: number;
  clientRequestId: string;
  occurredAt?: string;
};

export type ConsumptionSuccessResponse = {
  ok: true;
  recordId: string;
  idempotentReplay: boolean;
  voided: boolean;
};

export type ConsumptionErrorCode =
  | "invalid_client_request_id"
  | "invalid_usage_type"
  | "invalid_quantity"
  | "material_not_found"
  | "material_inactive"
  | "invalid_material"
  | "not_found"
  | "rate_limited"
  | "upstream_error"
  | "schema_mismatch";

export class ConsumptionApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ConsumptionErrorCode | "already_voided",
  ) {
    super(code);
    this.name = "ConsumptionApiError";
  }
}

export function isValidUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

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

function parseOccurredAt(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function validateClientRequestId(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ConsumptionApiError(400, "invalid_client_request_id");
  }
  const id = raw.trim();
  if (!isValidUuidV4(id)) {
    throw new ConsumptionApiError(400, "invalid_client_request_id");
  }
  return id;
}

export function validateUsageType(raw: unknown): UsageType {
  if (typeof raw !== "string" || !isUsageType(raw)) {
    throw new ConsumptionApiError(400, "invalid_usage_type");
  }
  return raw;
}

export function validateQuantityAgainstMaterial(
  quantity: unknown,
  materialFields: Record<string, unknown>,
): number {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    throw new ConsumptionApiError(422, "invalid_quantity");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ConsumptionApiError(422, "invalid_quantity");
  }

  const defaultIncrement = normalizeDefaultIncrement(
    materialFields.default_increment,
  );
  if (quantity < defaultIncrement || quantity % defaultIncrement !== 0) {
    throw new ConsumptionApiError(422, "invalid_quantity");
  }
  return quantity;
}

async function loadActiveMaterial(
  pat: string,
  baseId: string,
  materialsTable: string,
  materialId: string,
): Promise<AirtableRecord> {
  if (!AIRTABLE_RECORD_ID.test(materialId)) {
    throw new ConsumptionApiError(404, "material_not_found");
  }

  const record = await getRecord(pat, baseId, materialsTable, materialId);
  if (!record) {
    throw new ConsumptionApiError(404, "material_not_found");
  }

  if (record.fields.active !== true) {
    throw new ConsumptionApiError(422, "material_inactive");
  }

  const category = asOptionName(record.fields.category);
  if (!category || !CANONICAL_CATEGORY.has(category)) {
    throw new ConsumptionApiError(400, "invalid_material");
  }

  const unit = asOptionName(record.fields.unit);
  if (!unit) {
    throw new ConsumptionApiError(400, "invalid_material");
  }

  return record;
}

function toSuccessResponse(
  record: AirtableRecord,
  idempotentReplay: boolean,
): ConsumptionSuccessResponse {
  return {
    ok: true,
    recordId: record.id,
    idempotentReplay,
    voided: isRecordVoided(record),
  };
}

export async function postConsumptionRecord(input: {
  pat: string;
  baseId: string;
  materialsTable: string;
  consumptionTable: string;
  body: ConsumptionPostBody;
}): Promise<ConsumptionSuccessResponse> {
  const clientRequestId = validateClientRequestId(input.body.clientRequestId);
  const usageType = validateUsageType(input.body.usageType);
  const materialId =
    typeof input.body.materialId === "string" ? input.body.materialId.trim() : "";
  if (!materialId) {
    throw new ConsumptionApiError(404, "material_not_found");
  }

  const material = await loadActiveMaterial(
    input.pat,
    input.baseId,
    input.materialsTable,
    materialId,
  );
  const quantity = validateQuantityAgainstMaterial(
    input.body.quantity,
    material.fields,
  );
  const occurredAt = parseOccurredAt(input.body.occurredAt);
  const lookupDays = getIdempotencyLookupDays();

  const writeKeys = await resolveConsumptionWriteKeys(
    input.pat,
    input.baseId,
    input.consumptionTable,
  );
  const occurredAtType = await resolveTableFieldType(
    input.pat,
    input.baseId,
    input.consumptionTable,
    "occurred_at",
  );
  const occurredAtValue = formatOccurredAtForAirtable(
    occurredAt,
    occurredAtType,
  );

  const existing = await findConsumptionByClientRequestId(
    input.pat,
    input.baseId,
    input.consumptionTable,
    clientRequestId,
    lookupDays,
    writeKeys.client_request_id,
  );

  if (existing.length > 0) {
    return toSuccessResponse(existing[0]!, true);
  }

  const created = await createRecord(
    input.pat,
    input.baseId,
    input.consumptionTable,
    {
      [writeKeys.material]: [materialId],
      [writeKeys.usage_type]: usageType,
      [writeKeys.quantity]: quantity,
      [writeKeys.occurred_at]: occurredAtValue,
      [writeKeys.client_request_id]: clientRequestId,
      [writeKeys.voided]: false,
    },
  );

  const dupCheck = await findConsumptionByClientRequestId(
    input.pat,
    input.baseId,
    input.consumptionTable,
    clientRequestId,
    lookupDays,
    writeKeys.client_request_id,
  );
  if (dupCheck.length > 1) {
    console.warn(
      "[consumption] duplicate client_request_id rows detected:",
      clientRequestId,
      dupCheck.length,
    );
    return toSuccessResponse(dupCheck[0]!, true);
  }

  return toSuccessResponse(created, false);
}

export function isValidConsumptionRecordId(id: string): boolean {
  return AIRTABLE_RECORD_ID.test(id);
}

export async function voidConsumptionRecord(input: {
  pat: string;
  baseId: string;
  consumptionTable: string;
  recordId: string;
  reason?: string;
}): Promise<{ ok: true; recordId: string }> {
  if (!isValidConsumptionRecordId(input.recordId)) {
    throw new ConsumptionApiError(400, "not_found");
  }

  const record = await getRecord(
    input.pat,
    input.baseId,
    input.consumptionTable,
    input.recordId,
  );
  if (!record) {
    throw new ConsumptionApiError(404, "not_found");
  }
  if (isRecordVoided(record)) {
    throw new ConsumptionApiError(409, "already_voided");
  }

  const voidReason = input.reason?.trim() || "user_undo";
  const voidedKey = await resolveTableFieldName(
    input.pat,
    input.baseId,
    input.consumptionTable,
    "voided",
  );
  const voidReasonKey = await resolveTableFieldName(
    input.pat,
    input.baseId,
    input.consumptionTable,
    "void_reason",
  );
  const patched = await patchRecord(
    input.pat,
    input.baseId,
    input.consumptionTable,
    input.recordId,
    {
      [voidedKey]: true,
      [voidReasonKey]: voidReason,
    },
  );

  return { ok: true, recordId: patched.id };
}

export function mapAirtableError(e: unknown): ConsumptionApiError {
  if (e instanceof ConsumptionApiError) return e;
  if (e instanceof AirtableHttpError) {
    if (e.status === 429) {
      return new ConsumptionApiError(429, "rate_limited");
    }
    if (e.status === 422) {
      if (
        e.message.includes("INVALID_VALUE_FOR_COLUMN") ||
        e.message.includes("UNKNOWN_FIELD_NAME")
      ) {
        return new ConsumptionApiError(422, "schema_mismatch");
      }
    }
    if (e.status >= 500) {
      return new ConsumptionApiError(502, "upstream_error");
    }
    if (e.status === 404) {
      return new ConsumptionApiError(404, "not_found");
    }
    return new ConsumptionApiError(502, "upstream_error");
  }
  return new ConsumptionApiError(502, "upstream_error");
}
