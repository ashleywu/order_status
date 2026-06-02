import type { MaterialsPayload } from "./materials-contract";
import {
  MATERIALS_SCHEMA_VERSION,
  MATERIALS_STORAGE_KEY,
} from "./materials-contract";

function isMaterialsPayload(value: unknown): value is MaterialsPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.generatedAt !== "string" ||
    typeof v.schemaVersion !== "number" ||
    !Array.isArray(v.materials)
  ) {
    return false;
  }
  if (v.schemaVersion !== MATERIALS_SCHEMA_VERSION) return false;
  return true;
}

export function readMaterialsCache(): MaterialsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!isMaterialsPayload(data)) {
      localStorage.removeItem(MATERIALS_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(MATERIALS_STORAGE_KEY);
    return null;
  }
}

export function writeMaterialsCache(payload: MaterialsPayload): void {
  if (payload.schemaVersion !== MATERIALS_SCHEMA_VERSION) return;
  localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(payload));
}

export function clearMaterialsCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MATERIALS_STORAGE_KEY);
}

export { MATERIALS_SCHEMA_VERSION, MATERIALS_STORAGE_KEY };

export async function fetchMaterialsPayload(): Promise<MaterialsPayload> {
  const res = await fetch("/api/materials", { credentials: "include" });
  if (res.status === 401) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return (await res.json()) as MaterialsPayload;
}
