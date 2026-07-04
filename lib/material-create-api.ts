import { resolveTableFieldName } from "./airtable-field-names";
import {
  AirtableHttpError,
  createRecord,
  fetchAllRecords,
  type AirtableRecord,
} from "./airtable";
import { escapeAirtableFormulaString } from "./airtable-formula";
import { CATEGORY_ORDER } from "./materials-contract";
import type { MaterialCreateBody } from "./material-form-config";
import { categoryForMaterialGroup } from "./material-groups";
import { mapRecordToMaterialDto } from "./materials-map";
import type { MaterialDto } from "./materials-contract";

const SUPPLIERS_TABLE = "Suppliers";

const ALLOWED_UNITS = new Set([
  "ml",
  "g",
  "drops",
  "piece",
  "sheet",
  "roll",
  "cm",
]);

export class MaterialCreateError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "MaterialCreateError";
  }
}

function parseCategory(raw: unknown) {
  if (
    typeof raw === "string" &&
    (CATEGORY_ORDER as readonly string[]).includes(raw)
  ) {
    return raw as (typeof CATEGORY_ORDER)[number];
  }
  throw new MaterialCreateError("invalid_category");
}

function parseName(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new MaterialCreateError("invalid_name");
  }
  return raw.trim();
}

function parseOptionalText(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t || undefined;
}

function parsePrice(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new MaterialCreateError("invalid_price");
  }
  return n;
}

function parseUnit(raw: unknown): string {
  if (typeof raw !== "string" || !ALLOWED_UNITS.has(raw)) {
    throw new MaterialCreateError("invalid_unit");
  }
  return raw;
}

function parseDefaultIncrement(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return 1;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new MaterialCreateError("invalid_default_increment");
  }
  return n;
}

export function parseMaterialCreateBody(json: unknown): MaterialCreateBody {
  if (!json || typeof json !== "object") {
    throw new MaterialCreateError("invalid_body");
  }
  const o = json as Record<string, unknown>;
  const materialGroup = parseOptionalText(o.materialGroup);
  const category =
    o.category !== undefined && o.category !== null && o.category !== ""
      ? parseCategory(o.category)
      : materialGroup
        ? categoryForMaterialGroup(materialGroup)
        : parseCategory(o.category);
  return {
    name: parseName(o.name),
    category,
    supplier: parseOptionalText(o.supplier),
    price: parsePrice(o.price),
    materialGroup,
    unit: parseUnit(o.unit),
    defaultIncrement: parseDefaultIncrement(o.defaultIncrement),
    size: parseOptionalText(o.size),
    color: parseOptionalText(o.color),
    capType: parseOptionalText(o.capType),
  };
}

async function findSupplierByName(
  pat: string,
  baseId: string,
  name: string,
): Promise<AirtableRecord | null> {
  const nameKey = await resolveTableFieldName(pat, baseId, SUPPLIERS_TABLE, "name");
  const escaped = escapeAirtableFormulaString(name);
  const records = await fetchAllRecords(
    pat,
    baseId,
    SUPPLIERS_TABLE,
    `{${nameKey}}="${escaped}"`,
  );
  return records[0] ?? null;
}

async function findOrCreateSupplier(
  pat: string,
  baseId: string,
  name: string,
): Promise<string> {
  const existing = await findSupplierByName(pat, baseId, name);
  if (existing) return existing.id;
  const nameKey = await resolveTableFieldName(pat, baseId, SUPPLIERS_TABLE, "name");
  const created = await createRecord(pat, baseId, SUPPLIERS_TABLE, { [nameKey]: name });
  return created.id;
}

async function resolveMaterialWriteKeys(
  pat: string,
  baseId: string,
  materialsTable: string,
): Promise<Record<string, string>> {
  const keys = [
    "name",
    "category",
    "unit",
    "default_increment",
    "active",
    "favorite",
    "sort_order",
    "material_group",
    "supplier",
    "price",
    "size",
    "color",
    "cap_type",
  ] as const;
  const out: Record<string, string> = {};
  for (const key of keys) {
    out[key] = await resolveTableFieldName(pat, baseId, materialsTable, key);
  }
  return out;
}

export async function createMaterialRecord(input: {
  pat: string;
  baseId: string;
  materialsTable: string;
  body: MaterialCreateBody;
}): Promise<MaterialDto> {
  const keys = await resolveMaterialWriteKeys(
    input.pat,
    input.baseId,
    input.materialsTable,
  );

  const fields: Record<string, unknown> = {
    [keys.name]: input.body.name,
    [keys.category]: input.body.category,
    [keys.unit]: input.body.unit,
    [keys.default_increment]: input.body.defaultIncrement ?? 1,
    [keys.active]: true,
    [keys.favorite]: false,
    [keys.sort_order]: 999,
  };

  if (input.body.materialGroup) {
    fields[keys.material_group] = input.body.materialGroup;
  }

  if (input.body.supplier) {
    const supplierId = await findOrCreateSupplier(
      input.pat,
      input.baseId,
      input.body.supplier,
    );
    fields[keys.supplier] = [supplierId];
  }

  if (input.body.price !== undefined) {
    fields[keys.price] = input.body.price;
  }

  if (input.body.size) {
    fields[keys.size] = input.body.size;
  }
  if (input.body.color) {
    fields[keys.color] = input.body.color;
  }
  if (input.body.capType) {
    fields[keys.cap_type] = input.body.capType;
  }

  let record: AirtableRecord;
  try {
    record = await createRecord(
      input.pat,
      input.baseId,
      input.materialsTable,
      fields,
    );
  } catch (e) {
    if (e instanceof AirtableHttpError) {
      const msg = e.message.toLowerCase();
      if (msg.includes("price")) {
        throw new MaterialCreateError(
          "missing_price_field",
          "Airtable Materials 表缺少 price 字段，请添加 Number 类型字段 price",
        );
      }
      if (
        msg.includes("invalid_multiple_choice") ||
        msg.includes("select option")
      ) {
        throw new MaterialCreateError(
          "invalid_unit",
          "Airtable 的 unit 单选里没有该选项，请在 Materials 表 unit 字段添加，或改选已有单位（如 ml）。",
        );
      }
      if (msg.includes("unknown field name")) {
        throw new MaterialCreateError(
          "upstream_error",
          "Airtable 字段名不匹配（常见：CSV 导入后 name 列带乱码，见 airtable/FIX-CONSUMPTION.txt）",
        );
      }
    }
    throw e;
  }

  const dto = mapRecordToMaterialDto(record);
  if (!dto) {
    throw new MaterialCreateError("invalid_material_created");
  }
  return dto;
}

export function mapMaterialCreateError(e: unknown): {
  status: number;
  code: string;
} {
  if (e instanceof MaterialCreateError) {
    const clientErrors = new Set([
      "invalid_name",
      "invalid_category",
      "invalid_unit",
      "invalid_price",
      "invalid_default_increment",
      "invalid_body",
      "missing_price_field",
    ]);
    return {
      status: clientErrors.has(e.code) ? 422 : 502,
      code: e.code,
    };
  }
  if (e instanceof AirtableHttpError) {
    return { status: e.status === 429 ? 429 : 502, code: "upstream_error" };
  }
  return { status: 502, code: "upstream_error" };
}
