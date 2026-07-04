/** M4 draft + usage enums — Airtable `usage_type` single-select API values */

export const USAGE_TYPE_VALUES = [
  "custom",
  "finished_product",
  "corporate_client",
  "brand_sponsorship",
  "rd_lab",
  "workshop",
  "raw_repack",
  "product_sample",
] as const;

export type UsageType = (typeof USAGE_TYPE_VALUES)[number];

export const USAGE_TYPES = new Set<string>(USAGE_TYPE_VALUES);

export type DraftConsumption = {
  materialId?: string;
  usageType?: UsageType;
  quantity?: number;
};

export const USAGE_OPTIONS: {
  value: UsageType;
  label: string;
  shortLabel: string;
}[] = [
  { value: "custom", label: "定制", shortLabel: "定制" },
  { value: "finished_product", label: "成品", shortLabel: "成品" },
  { value: "corporate_client", label: "企业客户", shortLabel: "企业客户" },
  {
    value: "brand_sponsorship",
    label: "品牌赞助/赠品",
    shortLabel: "品牌赞助/赠品",
  },
  { value: "rd_lab", label: "研发", shortLabel: "研发" },
  { value: "workshop", label: "工作坊", shortLabel: "工作坊" },
  { value: "raw_repack", label: "原料分装", shortLabel: "原料分装" },
  { value: "product_sample", label: "产品小样", shortLabel: "产品小样" },
];

export function isUsageType(raw: string): raw is UsageType {
  return USAGE_TYPES.has(raw);
}

export function usageLabel(type: UsageType): string {
  return USAGE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
