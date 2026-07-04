import type { CanonicalCategorySlug } from "./materials-contract";

/** Materials.material_group — fixed business taxonomy (Airtable single select). */

export const MATERIAL_GROUP_OPTIONS = [
  "精油",
  "植物油",
  "纯露",
  "皂基",
  "植物蜡",
  "去离子水",
  "植物调香酒精",
  "瓶子",
  "标签",
  "产品纸盒包装",
  "产品纸盒标签",
  "订单纸盒包装",
  "订单手提袋",
  "礼盒",
  "快递纸盒",
  "打包胶带",
  "打包用的蜂窝纸",
  "牛皮泡沫纸",
  "产品卡",
  "雪梨纸",
  "填充拉菲纸",
  "面油",
  "眼油",
  "身体按摩油",
  "情绪油",
  "纯精油配方",
  "淡香水",
  "精油皂",
  "润唇膏",
  "唇油",
  "精油喷雾",
] as const;

export type MaterialGroupSlug = (typeof MATERIAL_GROUP_OPTIONS)[number];

export const MATERIAL_GROUP_SET = new Set<string>(MATERIAL_GROUP_OPTIONS);

export function isMaterialGroup(value: string): value is MaterialGroupSlug {
  return MATERIAL_GROUP_SET.has(value);
}

/** Default group when creating materials by App category slug. */
export const DEFAULT_MATERIAL_GROUP_BY_CATEGORY: Record<
  string,
  MaterialGroupSlug
> = {
  ingredient: "精油",
  bottle: "瓶子",
  label: "标签",
  ribbon: "打包胶带",
  packaging: "产品纸盒包装",
};

export function defaultMaterialGroupForCategory(
  category: string,
): MaterialGroupSlug | undefined {
  return DEFAULT_MATERIAL_GROUP_BY_CATEGORY[category];
}

const INGREDIENT_GROUPS: readonly MaterialGroupSlug[] = [
  "精油",
  "植物油",
  "纯露",
  "皂基",
  "植物蜡",
  "去离子水",
  "植物调香酒精",
  "面油",
  "眼油",
  "身体按摩油",
  "情绪油",
  "纯精油配方",
  "淡香水",
  "精油皂",
  "润唇膏",
  "唇油",
  "精油喷雾",
];

const PACKAGING_GROUPS: readonly MaterialGroupSlug[] = [
  "产品纸盒包装",
  "产品纸盒标签",
  "订单纸盒包装",
  "订单手提袋",
  "礼盒",
  "快递纸盒",
  "产品卡",
  "雪梨纸",
  "填充拉菲纸",
  "打包用的蜂窝纸",
  "牛皮泡沫纸",
];

const MATERIAL_GROUP_TO_CATEGORY: Record<MaterialGroupSlug, CanonicalCategorySlug> =
  Object.fromEntries([
    ...INGREDIENT_GROUPS.map((g) => [g, "ingredient"] as const),
    ["瓶子", "bottle"],
    ["标签", "label"],
    ["打包胶带", "ribbon"],
    ...PACKAGING_GROUPS.map((g) => [g, "packaging"] as const),
  ]) as Record<MaterialGroupSlug, CanonicalCategorySlug>;

/** Derive Airtable `category` from selected material_group. */
export function categoryForMaterialGroup(group: string): CanonicalCategorySlug {
  if (isMaterialGroup(group)) {
    return MATERIAL_GROUP_TO_CATEGORY[group];
  }
  return "ingredient";
}
