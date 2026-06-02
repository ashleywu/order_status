"use client";

import type { DraftConsumption, UsageType } from "@/lib/consumption-types";
import { clearClientRequestIdStorage } from "@/lib/client-request-id";
import {
  clearDraftStorage,
  readDraft,
  writeDraft,
} from "@/lib/draft-storage";
import { clearLastRecordId } from "@/lib/last-record-session";
import { useMaterials } from "@/contexts/materials-provider";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DraftContextValue = {
  draft: DraftConsumption;
  selectMaterial: (materialId: string) => void;
  changeMaterial: () => void;
  selectUsage: (usageType: UsageType) => void;
  setQuantity: (quantity: number) => void;
  resetDraft: () => void;
  clearDraft: () => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

function clearM5SessionKeys(): void {
  clearClientRequestIdStorage();
  clearLastRecordId();
}

export function DraftProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { getMaterial } = useMaterials();
  const [draft, setDraft] = useState<DraftConsumption>(() => readDraft());

  useEffect(() => {
    writeDraft(draft);
  }, [draft]);

  const persist = useCallback((next: DraftConsumption) => {
    setDraft(next);
  }, []);

  const selectMaterial = useCallback(
    (materialId: string) => {
      clearM5SessionKeys();
      persist({
        materialId,
        usageType: undefined,
        quantity: undefined,
      });
      router.push("/usage");
    },
    [persist, router],
  );

  const changeMaterial = useCallback(() => {
    clearM5SessionKeys();
    persist({});
    router.push("/pick");
  }, [persist, router]);

  const selectUsage = useCallback(
    (usageType: UsageType) => {
      clearM5SessionKeys();
      const material = draft.materialId ? getMaterial(draft.materialId) : undefined;
      const defaultQty = material?.defaultIncrement ?? 1;
      persist({
        materialId: draft.materialId,
        usageType,
        quantity: defaultQty,
      });
      router.push("/quantity");
    },
    [draft.materialId, getMaterial, persist, router],
  );

  const setQuantity = useCallback(
    (quantity: number) => {
      persist({ ...draft, quantity });
    },
    [draft, persist],
  );

  const resetDraft = useCallback(() => {
    clearDraftStorage();
    clearM5SessionKeys();
    setDraft({});
    router.push("/");
  }, [router]);

  const clearDraft = useCallback(() => {
    clearDraftStorage();
    clearClientRequestIdStorage();
    setDraft({});
  }, []);

  const value = useMemo(
    (): DraftContextValue => ({
      draft,
      selectMaterial,
      changeMaterial,
      selectUsage,
      setQuantity,
      resetDraft,
      clearDraft,
    }),
    [
      draft,
      selectMaterial,
      changeMaterial,
      selectUsage,
      setQuantity,
      resetDraft,
      clearDraft,
    ],
  );

  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  );
}

export function useDraftConsumption(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) {
    throw new Error("useDraftConsumption must be used within DraftProvider");
  }
  return ctx;
}
