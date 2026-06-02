import type { DraftConsumption } from "./consumption-types";

export const DRAFT_STORAGE_KEY = "consumption:m4:draft";

function isDraft(value: unknown): value is DraftConsumption {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.materialId !== undefined && typeof v.materialId !== "string") return false;
  if (
    v.usageType !== undefined &&
    !["rd_lab", "product", "marketing", "workshop"].includes(v.usageType as string)
  ) {
    return false;
  }
  if (v.quantity !== undefined && typeof v.quantity !== "number") return false;
  return true;
}

export function readDraft(): DraftConsumption {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (!isDraft(data)) {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      return {};
    }
    return data;
  } catch {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    return {};
  }
}

export function writeDraft(draft: DraftConsumption): void {
  if (typeof window === "undefined") return;
  if (!draft.materialId && !draft.usageType && draft.quantity === undefined) {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraftStorage(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}
