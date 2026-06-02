/** 与 [M3.md](M3.md)、[plan-airtable.md](plan-airtable.md) §6.1 一致；契约 bump 时递增 `MATERIALS_SCHEMA_VERSION`。 */

export const MATERIALS_SCHEMA_VERSION = 1;

/** 结构调整时改 key（不必改 schemaVersion）；与文档示例 `schemaVersion: 1` 一致 */
export const MATERIALS_STORAGE_KEY = "consumption:m3-ui-contract:materials";

/** 与 plan / M1 单选 API 名一致 */
export const CATEGORY_ORDER = [
  "ingredient",
  "bottle",
  "label",
  "ribbon",
  "packaging",
] as const;

export type CanonicalCategorySlug = (typeof CATEGORY_ORDER)[number];

/** Materials 表中 API 枚举 + 无法匹配时的「其他」桶（见 M3 UI 契约） */
export type MaterialCategorySlug = CanonicalCategorySlug | "other";

export type TabSlug = MaterialCategorySlug;

/** 单层响应（MaterialsPayload ≡ M3 「MaterialsResponse」） */
export type MaterialDto = {
  id: string;
  name: string;
  buttonLabel: string;
  category: MaterialCategorySlug;
  /** 来自 Airtable material_group */
  group: string;
  unit: string;
  defaultIncrement: number;
  quickAmounts: number[];
  favorite: boolean;
  sortOrder: number;
  imageUrl: string | null;
};

export type MaterialsPayload = {
  materials: MaterialDto[];
  generatedAt: string;
  schemaVersion: number;
};

export const CATEGORY_LABEL: Record<MaterialCategorySlug, string> = {
  ingredient: "Ingredient",
  bottle: "Bottle",
  label: "Label",
  ribbon: "Ribbon",
  packaging: "Packaging",
  other: "其他",
};
