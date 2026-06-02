export const RECENT_MATERIALS_KEY = "consumption:m4:recent-materials";
const MAX_RECENT = 8;

export type RecentMaterialEntry = {
  materialId: string;
  usedAt: string;
};

type RecentStore = {
  entries: RecentMaterialEntry[];
};

function isRecentStore(value: unknown): value is RecentStore {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.entries)) return false;
  return v.entries.every(
    (e) =>
      e &&
      typeof e === "object" &&
      typeof (e as RecentMaterialEntry).materialId === "string" &&
      typeof (e as RecentMaterialEntry).usedAt === "string",
  );
}

export function readRecentMaterials(): RecentMaterialEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_MATERIALS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!isRecentStore(data)) {
      localStorage.removeItem(RECENT_MATERIALS_KEY);
      return [];
    }
    return data.entries;
  } catch {
    localStorage.removeItem(RECENT_MATERIALS_KEY);
    return [];
  }
}

/** Prepend, dedupe by materialId (keep latest usedAt), cap at 8. */
export function recordRecentMaterial(materialId: string): RecentMaterialEntry[] {
  const usedAt = new Date().toISOString();
  const prev = readRecentMaterials().filter((e) => e.materialId !== materialId);
  const entries = [{ materialId, usedAt }, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_MATERIALS_KEY, JSON.stringify({ entries }));
  return entries;
}
