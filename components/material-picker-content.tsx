"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import { MaterialGridButton } from "@/components/material-grid-button";
import {
  MaterialsGate,
  MaterialsStatusPanel,
} from "@/components/materials-status-panel";
import { useDraftConsumption } from "@/contexts/draft-provider";
import { useMaterials } from "@/hooks/use-materials";
import {
  CATEGORY_LABEL,
  type MaterialDto,
  type TabSlug,
} from "@/lib/materials-contract";
import { compareMaterialsStable } from "@/lib/material-display";
import {
  defaultPickerTab,
  parseCategoryParam,
  tabsPresent,
  writeLastPickerCategory,
} from "@/lib/picker-utils";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function MaterialPickerInner() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const {
    data,
    loading,
    error,
    showingStaleCache,
    hasFetchedSuccessfully,
    refresh,
  } = useMaterials();
  const { selectMaterial, resetDraft } = useDraftConsumption();

  const mats = useMemo(() => data?.materials ?? [], [data?.materials]);
  const sortedMats = useMemo(
    () => [...mats].sort(compareMaterialsStable),
    [mats],
  );

  const presentTabs = useMemo(() => tabsPresent(mats), [mats]);

  const [tab, setTab] = useState<TabSlug>("ingredient");
  const [chip, setChip] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    const fromUrl = parseCategoryParam(categoryParam, mats);
    const def = fromUrl ?? defaultPickerTab(mats);
    if (def) setTab(def);
  }, [categoryParam, mats]);

  useEffect(() => {
    setChip(null);
  }, [tab]);

  const catMaterials = useMemo(
    () => sortedMats.filter((m) => m.category === tab),
    [sortedMats, tab],
  );

  const groupNames = useMemo(
    () => [...new Set(catMaterials.map((m) => m.group))],
    [catMaterials],
  );

  const gridItems = useMemo(() => {
    if (chip === null) return catMaterials;
    return catMaterials.filter((m) => m.group === chip);
  }, [catMaterials, chip]);

  function onTabChange(next: TabSlug) {
    setTab(next);
    writeLastPickerCategory(next);
  }

  async function refreshWithHint() {
    const ok = await refresh();
    if (ok) {
      setJustUpdated(true);
      window.setTimeout(() => setJustUpdated(false), 2500);
    }
  }

  const gate = (
    <MaterialsGate
      loading={loading}
      error={error}
      materialCount={mats.length}
      showingStaleCache={showingStaleCache}
      hasFetchedSuccessfully={hasFetchedSuccessfully}
      onRetry={() => void refreshWithHint()}
    />
  );

  return (
    <ConsumptionPageShell
      title="选择物料"
      subtitle="分类 · 分组 · 大按钮"
      backHref="/"
      backLabel="← 首页"
      showReset
      onReset={resetDraft}
    >
      <div className="space-y-5">
        <MaterialsStatusPanel
          loading={loading}
          error={error}
          showingStaleCache={showingStaleCache}
          generatedAt={data?.generatedAt}
          justUpdated={justUpdated}
          onRefresh={() => void refreshWithHint()}
        />

        {gate}

        {mats.length > 0 ? (
          <>
            {presentTabs.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="category">
                {presentTabs.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={tab === c}
                    onClick={() => onTabChange(c)}
                    className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
                      tab === c
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            ) : null}

            {catMaterials.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-label="group">
                <button
                  type="button"
                  onClick={() => setChip(null)}
                  className={`min-h-9 rounded-full px-3 py-1.5 text-sm ${
                    chip === null
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  全部分组
                </button>
                {groupNames.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setChip(chip === g ? null : g)}
                    className={`min-h-9 rounded-full px-3 py-1.5 text-sm ${
                      chip === g
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            ) : null}

            <section className="space-y-2">
              <h2 className="text-sm font-medium text-slate-600">
                {CATEGORY_LABEL[tab]} · 列表
                {loading ? (
                  <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                    后台更新…
                  </span>
                ) : null}
              </h2>
              {gridItems.length === 0 && mats.length > 0 ? (
                <p className="text-sm text-slate-500">
                  该分组下暂无物料，请切换 Chip 或其它分类。
                </p>
              ) : null}
              {gridItems.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {gridItems.map((m: MaterialDto) => (
                    <li key={m.id}>
                      <MaterialGridButton
                        material={m}
                        onSelect={selectMaterial}
                        highlighted={m.favorite}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </ConsumptionPageShell>
  );
}

export function MaterialPickerContent() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
      }
    >
      <MaterialPickerInner />
    </Suspense>
  );
}
