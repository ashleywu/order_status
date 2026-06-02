/** M4 draft + usage enums — aligned with [M4.md](M4.md) §8 */

export type UsageType = "rd_lab" | "product" | "marketing" | "workshop";

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
  { value: "rd_lab", label: "R&D / Lab", shortLabel: "研发" },
  { value: "product", label: "Product", shortLabel: "产品" },
  { value: "marketing", label: "Marketing", shortLabel: "市场" },
  { value: "workshop", label: "Workshop", shortLabel: "工坊" },
];

export function usageLabel(type: UsageType): string {
  return USAGE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
