import type { CanonicalCategorySlug } from "./materials-contract";

/** Categories exposed on the add-material form (per product request). */
export const MATERIAL_FORM_CATEGORIES = [
  "ingredient",
  "bottle",
  "packaging",
  "ribbon",
] as const satisfies readonly CanonicalCategorySlug[];

export type MaterialFormCategory = (typeof MATERIAL_FORM_CATEGORIES)[number];

export const CAP_TYPE_OPTIONS = [
  { value: "dropper", label: "Dropper 滴管" },
  { value: "flat", label: "Flat 平盖" },
] as const;

export const UNIT_OPTIONS = [
  "ml",
  "g",
  "drops",
  "piece",
  "sheet",
  "roll",
  "cm",
] as const;

export const DEFAULT_UNIT_BY_CATEGORY: Record<MaterialFormCategory, string> = {
  ingredient: "drops",
  bottle: "piece",
  packaging: "piece",
  ribbon: "roll",
};

export type MaterialCreateBody = {
  name: string;
  category: MaterialFormCategory;
  supplier?: string;
  price?: number;
  materialGroup?: string;
  unit: string;
  defaultIncrement?: number;
  size?: string;
  color?: string;
  capType?: string;
};

export function categoryShowsBottleSpecs(
  category: CanonicalCategorySlug,
): boolean {
  return category === "bottle";
}

export function categoryShowsPackagingSpecs(
  category: CanonicalCategorySlug,
): boolean {
  return category === "packaging";
}
