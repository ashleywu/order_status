"use client";

import type { MaterialDto } from "@/lib/materials-contract";
import type { MaterialsPayload } from "@/lib/materials-contract";
import { handleSessionExpired, isUnauthorizedError } from "@/lib/auth-unauthorized";
import {
  MATERIALS_SCHEMA_VERSION,
  clearMaterialsCache,
  fetchMaterialsPayload,
  readMaterialsCache,
  writeMaterialsCache,
} from "@/lib/materials-client";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type UseMaterialsResult = {
  data: MaterialsPayload | null;
  materialsMap: Map<string, MaterialDto>;
  loading: boolean;
  error: string | null;
  showingStaleCache: boolean;
  hasFetchedSuccessfully: boolean;
  refresh: () => Promise<boolean>;
  getMaterial: (id: string) => MaterialDto | undefined;
};

const MaterialsContext = createContext<UseMaterialsResult | null>(null);

const REFRESH_DEBOUNCE_MS = 450;

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<MaterialsPayload | null>(() => readMaterialsCache());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingStaleCache, setShowingStaleCache] = useState(false);
  const [hasFetchedSuccessfully, setHasFetchedSuccessfully] = useState(false);
  const lastRefreshAt = useRef(0);
  const latestData = useRef<MaterialsPayload | null>(null);
  latestData.current = data;

  useEffect(() => {
    const c = readMaterialsCache();
    if (c) setHasFetchedSuccessfully(true);
  }, []);

  const applySuccess = useCallback((body: MaterialsPayload) => {
    setData(body);
    setHasFetchedSuccessfully(true);
    setError(null);
    setShowingStaleCache(false);
    if (body.schemaVersion === MATERIALS_SCHEMA_VERSION) {
      writeMaterialsCache(body);
    } else {
      clearMaterialsCache();
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;

    let cancelled = false;

    async function silent() {
      setLoading(true);
      setError(null);
      try {
        const body = await fetchMaterialsPayload();
        if (cancelled) return;
        applySuccess(body);
      } catch (e) {
        if (cancelled) return;
        if (isUnauthorizedError(e)) {
          handleSessionExpired();
          return;
        }
        setError(e instanceof Error ? e.message : "加载失败");
        const cached = readMaterialsCache();
        if (cached?.materials?.length) {
          setData(cached);
          setShowingStaleCache(true);
          setHasFetchedSuccessfully(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void silent();
    return () => {
      cancelled = true;
    };
  }, [applySuccess, pathname]);

  const refresh = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastRefreshAt.current < REFRESH_DEBOUNCE_MS) return false;
    lastRefreshAt.current = now;

    setLoading(true);
    setError(null);
    try {
      const body = await fetchMaterialsPayload();
      applySuccess(body);
      return true;
    } catch (e) {
      if (isUnauthorizedError(e)) {
        handleSessionExpired();
        return false;
      }
      setError(e instanceof Error ? e.message : "刷新失败");
      const cached = readMaterialsCache();
      const canShowStale =
        !!cached?.materials?.length || !!latestData.current?.materials?.length;
      if (canShowStale) {
        setData((prev) => (prev?.materials.length ? prev : (cached ?? prev)));
        setShowingStaleCache(true);
        setHasFetchedSuccessfully(true);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [applySuccess]);

  const materialsMap = useMemo(() => {
    const map = new Map<string, MaterialDto>();
    for (const m of data?.materials ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [data?.materials]);

  const getMaterial = useCallback(
    (id: string) => materialsMap.get(id),
    [materialsMap],
  );

  const value = useMemo(
    (): UseMaterialsResult => ({
      data,
      materialsMap,
      loading,
      error,
      showingStaleCache,
      hasFetchedSuccessfully,
      refresh,
      getMaterial,
    }),
    [
      data,
      materialsMap,
      loading,
      error,
      showingStaleCache,
      hasFetchedSuccessfully,
      refresh,
      getMaterial,
    ],
  );

  return (
    <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>
  );
}

export function useMaterials(): UseMaterialsResult {
  const ctx = useContext(MaterialsContext);
  if (!ctx) {
    throw new Error("useMaterials must be used within MaterialsProvider");
  }
  return ctx;
}
