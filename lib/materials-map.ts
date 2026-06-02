import type { AirtableRecord } from "./airtable";
import { finalizeMaterialQuickAmounts } from "./quantity-defaults";
import type { MaterialCategorySlug, MaterialDto } from "./materials-contract";

const CANONICAL_CATEGORY = new Set<string>([
  "ingredient",
  "bottle",
  "label",
  "ribbon",
  "packaging",
]);

const ALLOWED_UNIT = new Set([
  "ml",
  "g",
  "drops",
  "piece",
  "sheet",
  "roll",
  "cm",
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

function asCheckbox(v: unknown): boolean {
  return v === true;
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function firstImageUrl(v: unknown): string | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const first = v[0];
  if (!first || typeof first !== "object" || !("url" in first)) return null;
  const url = (first as { url?: unknown }).url;
  if (typeof url === "string" && url.startsWith("https:")) return url;
  return null;
}

function stringField(fields: Record<string, unknown>, key: string): string {
  const v = fields[key] ?? fields["\ufeff" + key];
  return typeof v === "string" ? v : "";
}

/** 单条映射：非法 unit 丢弃；无法识别的 category → `other`（不丢行，满足 M3「其他 tab」）。 */
export function mapRecordToMaterialDto(record: AirtableRecord): MaterialDto | null {
  const { id, fields: f } = record;
  const nameRaw = stringField(f, "name");
  const name = nameRaw.trim() ? nameRaw : "";
  const buttonRaw = stringField(f, "button_label").trim();
  const catRaw = asOptionName(f.category);
  let category: MaterialCategorySlug;
  if (!catRaw || !CANONICAL_CATEGORY.has(catRaw)) {
    category = "other";
    if (catRaw && !CANONICAL_CATEGORY.has(catRaw)) {
      console.warn("[materials] unknown category mapped to \"other\":", id, catRaw);
    }
  } else {
    category = catRaw as MaterialCategorySlug;
  }

  const unit = asOptionName(f.unit);

  if (!ALLOWED_UNIT.has(unit)) {
    console.warn("[materials] drop row invalid unit:", { id, unit });
    return null;
  }

  const sortOrderRaw = asNumber(f.sort_order, Number.POSITIVE_INFINITY);
  const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 999_999;

  const quickField =
    typeof f.quick_amounts === "string" ? f.quick_amounts : undefined;
  const { defaultIncrement, quickAmounts } = finalizeMaterialQuickAmounts({
    unit,
    quickAmountsField: quickField,
    defaultIncrementRaw: f.default_increment,
  });

  const groupRaw = asOptionName(f.material_group).trim();

  return {
    id,
    name,
    buttonLabel: buttonRaw || name || "（未命名）",
    category,
    group: groupRaw || "未分组",
    unit,
    defaultIncrement,
    quickAmounts,
    favorite: asCheckbox(f.favorite),
    sortOrder,
    imageUrl: firstImageUrl(f.image),
  };
}

export function compareMaterialsStable(a: MaterialDto, b: MaterialDto): number {
  const fa = a.favorite ? 1 : 0;
  const fb = b.favorite ? 1 : 0;
  if (fb !== fa) return fb - fa;

  const soA = a.sortOrder ?? 999_999;
  const soB = b.sortOrder ?? 999_999;
  if (soA !== soB) return soA - soB;

  return a.name.localeCompare(b.name, "zh-CN");
}
