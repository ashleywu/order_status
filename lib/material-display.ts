import type { MaterialDto } from "./materials-contract";
import { compareMaterialsStable } from "./materials-map";

export { compareMaterialsStable };

export function primaryLabel(m: MaterialDto): string {
  const b = m.buttonLabel?.trim();
  if (b) return b;
  const n = m.name?.trim();
  if (n) return n;
  return "（未命名）";
}

export function formatUnit(unit: string): string {
  return unit?.trim() ? unit.trim() : "—";
}

export function syncLine(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Favorites on home: sortOrder asc → name asc */
export function compareFavoritesHome(a: MaterialDto, b: MaterialDto): number {
  const soA = a.sortOrder ?? 999_999;
  const soB = b.sortOrder ?? 999_999;
  if (soA !== soB) return soA - soB;
  return a.name.localeCompare(b.name, "zh-CN");
}
