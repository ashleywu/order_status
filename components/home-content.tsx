"use client";

import { MaterialGridButton } from "@/components/material-grid-button";
import {
  MaterialsGate,
  MaterialsStatusPanel,
} from "@/components/materials-status-panel";
import { useDraftConsumption } from "@/contexts/draft-provider";
import { useMaterials } from "@/hooks/use-materials";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type MaterialDto,
} from "@/lib/materials-contract";
import { compareFavoritesHome } from "@/lib/material-display";
import { readRecentMaterials } from "@/lib/recent-materials";
import { ChevronRight, ClipboardList, LogOut, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const HOME_FAVORITE_LIMIT = 12;

export function HomeContent() {
  const {
    data,
    loading,
    error,
    showingStaleCache,
    hasFetchedSuccessfully,
    refresh,
    getMaterial,
  } = useMaterials();
  const { selectMaterial } = useDraftConsumption();
  const pathname = usePathname();
  const [busyLogout, setBusyLogout] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const recentIds = useMemo(() => readRecentMaterials(), [pathname, data?.generatedAt]);

  const mats = useMemo(() => data?.materials ?? [], [data?.materials]);

  const favorites = useMemo(() => {
    return mats
      .filter((m) => m.favorite)
      .sort(compareFavoritesHome)
      .slice(0, HOME_FAVORITE_LIMIT);
  }, [mats]);

  const hasMoreFavorites = useMemo(
    () => mats.filter((m) => m.favorite).length > HOME_FAVORITE_LIMIT,
    [mats],
  );

  const recentMaterials = useMemo(() => {
    return recentIds
      .map((e) => getMaterial(e.materialId))
      .filter((m): m is MaterialDto => !!m);
  }, [recentIds, getMaterial]);

  const categoryLinks = useMemo(() => {
    return CATEGORY_ORDER.filter((c) => mats.some((m) => m.category === c));
  }, [mats]);

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

  async function refreshWithHint() {
    const ok = await refresh();
    if (ok) {
      setJustUpdated(true);
      window.setTimeout(() => setJustUpdated(false), 2500);
    }
  }

  async function logout() {
    setBusyLogout(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setBusyLogout(false);
      window.location.href = "/login";
    }
  }

  const showContent =
    mats.length > 0 || showingStaleCache || (hasFetchedSuccessfully && mats.length === 0);

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">记录消耗</h1>
        <p className="text-sm text-slate-600">选择物料 → 用途 → 数量 → 确认</p>

        <MaterialsStatusPanel
          loading={loading}
          error={error}
          showingStaleCache={showingStaleCache}
          generatedAt={data?.generatedAt}
          justUpdated={justUpdated}
          onRefresh={() => void refreshWithHint()}
        />

        <Link
          href="/summary"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-900 hover:bg-blue-100"
        >
          <ClipboardList className="h-5 w-5" aria-hidden />
          查看消耗记录
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>

        <button
          type="button"
          onClick={() => logout()}
          disabled={busyLogout}
          className="flex min-h-11 w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          退出登录
        </button>
      </header>

      {gate}

      {showContent && mats.length > 0 ? (
        <div className="mx-auto w-full max-w-lg space-y-8">
          {favorites.length > 0 ? (
            <section aria-label="常用物料" className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Star className="h-4 w-4 fill-current" aria-hidden />
                常用物料
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {favorites.map((m) => (
                  <li key={m.id}>
                    <MaterialGridButton
                      material={m}
                      onSelect={selectMaterial}
                      highlighted
                    />
                  </li>
                ))}
              </ul>
              {hasMoreFavorites ? (
                <Link
                  href="/pick"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  查看全部常用
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </section>
          ) : null}

          {recentMaterials.length > 0 ? (
            <section aria-label="最近使用" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">最近使用</h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {recentMaterials.map((m) => (
                  <li key={m.id}>
                    <MaterialGridButton material={m} onSelect={selectMaterial} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {categoryLinks.length > 0 ? (
            <section aria-label="分类入口" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">按分类浏览</h2>
              <div className="grid grid-cols-2 gap-2">
                {categoryLinks.map((c) => (
                  <Link
                    key={c}
                    href={`/pick?category=${c}`}
                    className="flex min-h-14 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    {CATEGORY_LABEL[c]}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <Link
            href="/pick"
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-base font-semibold text-white hover:bg-slate-900"
          >
            浏览全部物料
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </main>
  );
}
