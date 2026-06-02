import {
  CATEGORY_ORDER,
  type MaterialDto,
  type TabSlug,
} from "./materials-contract";

export const LAST_PICKER_CATEGORY_KEY = "consumption:m4:last-picker-category";

export function readLastPickerCategory(): TabSlug | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_PICKER_CATEGORY_KEY);
  if (!raw) return null;
  return raw as TabSlug;
}

export function writeLastPickerCategory(category: TabSlug): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_PICKER_CATEGORY_KEY, category);
}

export function tabsPresent(mats: MaterialDto[]): TabSlug[] {
  const out: TabSlug[] = [];
  for (const c of CATEGORY_ORDER) {
    if (mats.some((m) => m.category === c)) out.push(c);
  }
  if (mats.some((m) => m.category === "other")) out.push("other");
  return out;
}

/** Default tab: last used → most favorites → ingredient → first available */
export function defaultPickerTab(mats: MaterialDto[]): TabSlug | null {
  const present = tabsPresent(mats);
  if (present.length === 0) return null;

  const last = readLastPickerCategory();
  if (last && present.includes(last)) return last;

  let bestCat: TabSlug | null = null;
  let bestCount = -1;
  for (const c of CATEGORY_ORDER) {
    if (!present.includes(c)) continue;
    const count = mats.filter((m) => m.category === c && m.favorite).length;
    if (count > bestCount) {
      bestCount = count;
      bestCat = c;
    }
  }
  if (bestCat) return bestCat;

  if (present.includes("ingredient")) return "ingredient";
  return present[0] ?? null;
}

export function parseCategoryParam(
  raw: string | null | undefined,
  mats: MaterialDto[],
): TabSlug | null {
  if (!raw) return null;
  const present = tabsPresent(mats);
  if (present.includes(raw as TabSlug)) return raw as TabSlug;
  return null;
}
