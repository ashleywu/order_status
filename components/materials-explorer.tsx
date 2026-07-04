"use client";

import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type MaterialDto,
  type TabSlug,
} from "@/lib/materials-contract";
import { useMaterials } from "@/hooks/use-materials";
import { MATERIAL_GROUP_OPTIONS } from "@/lib/material-groups";
import { Loader2, LogIn, Package, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function primaryLabel(m: MaterialDto): string {
  const b = m.buttonLabel?.trim();
  if (b) return b;
  const n = m.name?.trim();
  if (n) return n;
  return "（未命名）";
}

function formatUnit(unit: string): string {
  return unit?.trim() ? unit.trim() : "—";
}

function syncLine(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function MaterialsExplorer() {
  const {
    data,
    loading,
    error,
    showingStaleCache,
    hasFetchedSuccessfully,
    refresh,
  } = useMaterials();
  const mats = useMemo(() => data?.materials ?? [], [data?.materials]);

  const tabsPresent = useMemo(() => {
    const out: TabSlug[] = [];
    for (const c of CATEGORY_ORDER) {
      if (mats.some((m: MaterialDto) => m.category === c)) out.push(c);
    }
    if (mats.some((m) => m.category === "other")) out.push("other");
    return out;
  }, [mats]);

  const [tab, setTab] = useState<TabSlug>("ingredient");
  useEffect(() => {
    const firstCanon = CATEGORY_ORDER.find((c) =>
      mats.some((m) => m.category === c),
    );
    if (firstCanon) {
      setTab(firstCanon);
      return;
    }
    if (mats.some((m) => m.category === "other")) {
      setTab("other");
    }
  }, [mats]);

  const favorites = useMemo(() => mats.filter((m) => m.favorite), [mats]);

  const catMaterials = useMemo(
    () => mats.filter((m) => m.category === tab),
    [mats, tab],
  );

  const groupNames = useMemo(() => {
    const present = new Set(catMaterials.map((m) => m.group));
    return MATERIAL_GROUP_OPTIONS.filter((g) => present.has(g));
  }, [catMaterials]);

  const [chip, setChip] = useState<string | null>(null);
  useEffect(() => {
    setChip(null);
  }, [tab]);

  const gridItems = useMemo(() => {
    if (chip === null) return catMaterials;
    return catMaterials.filter((m) => m.group === chip);
  }, [catMaterials, chip]);

  const devPreview = useMemo(() => {
    if (process.env.NODE_ENV !== "development" || !data) return null;
    const raw = JSON.stringify(data);
    return `${raw.slice(0, 800)}${raw.length > 800 ? "…" : ""}`;
  }, [data]);

  const fatalNoData =
    !loading &&
    !!error &&
    mats.length === 0 &&
    !showingStaleCache &&
    (!data || data.materials.length === 0);

  const bootstrap =
    loading &&
    mats.length === 0 &&
    !showingStaleCache &&
    !error &&
    !fatalNoData;

  const httpEmpty =
    !loading &&
    !error &&
    !!data &&
    data.materials.length === 0 &&
    hasFetchedSuccessfully;

  const [justUpdated, setJustUpdated] = useState(false);
  async function refreshWithHint() {
    const ok = await refresh();
    if (ok) {
      setJustUpdated(true);
      window.setTimeout(() => setJustUpdated(false), 2500);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-4 py-8 pb-28">
      <header className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <Link href="/" className="w-fit text-sm text-blue-600 hover:underline">
          ← 首页
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">物料 · M3 雏形</h1>
        <p className="text-sm text-slate-600">
          Category Tabs · Group Chips · 大按钮网格 · Favorite（无搜索框）。任意状态均有可读提示。
        </p>

        <button
          type="button"
          onClick={() => void refreshWithHint()}
          disabled={loading}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              更新中…
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" aria-hidden />
              刷新物料
            </>
          )}
        </button>

        {justUpdated ? (
          <p role="status" className="text-sm font-medium text-emerald-700">
            已更新
          </p>
        ) : null}

        {data?.generatedAt ? (
          <p className="text-xs font-medium text-slate-700">
            上次同步：
            <time dateTime={data.generatedAt}>{syncLine(data.generatedAt)}</time>
          </p>
        ) : null}

        {showingStaleCache ? (
          <div
            role="status"
            className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            <strong>未能连接服务器</strong>——以下为<strong>上次成功同步</strong>的快照。
            {error ? "下方仍有错误详情，可重试。" : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium">请求失败</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              className="mt-2 min-h-9 rounded-lg bg-red-100 px-3 py-1.5 font-medium text-red-900 hover:bg-red-200"
              onClick={() => void refreshWithHint()}
            >
              重试
            </button>
          </div>
        ) : null}
      </header>

      {bootstrap ? (
        <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
          <p className="text-center text-base font-medium text-slate-800">
            正在载入物料…
          </p>
          <p className="text-center text-xs text-slate-500">请稍候，勿关闭页面。</p>
        </section>
      ) : null}

      {fatalNoData ? (
        <section className="mx-auto w-full max-w-lg space-y-4 rounded-xl border-2 border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">无法载入物料列表</h2>
          <p className="text-sm text-slate-600">
            {error ??
              "请检查网络或服务配置后重试。若会话已过期，请先登录——否则可能出现「看似有列表但已过时」的假状态。"}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void refreshWithHint()}
              disabled={loading}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              重试
            </button>
            <Link
              href="/login"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              前往登录
            </Link>
          </div>
        </section>
      ) : null}

      {httpEmpty ? (
        <section className="mx-auto w-full max-w-lg rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-700">
          <p className="text-lg font-semibold">暂无可用物料</p>
          <p className="mt-2 text-sm leading-relaxed">
            服务端未返回任何 <code className="text-xs">active</code>{" "}
            记录。请到 Airtable 勾选 Active；若之前有数据而如今为零，也可能已全部停用或暂无——可再点击「刷新物料」确认。
          </p>
          <button
            type="button"
            onClick={() => void refreshWithHint()}
            disabled={loading}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            刷新物料
          </button>
        </section>
      ) : null}

      {!fatalNoData && !bootstrap && !httpEmpty ? (
        <div className="mx-auto w-full max-w-lg flex-1 space-y-8">
          {favorites.length > 0 ? (
            <section aria-label="常用物料" className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Star className="h-4 w-4 fill-current" aria-hidden />
                Favorite · 置顶
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {favorites.map((m) => (
                  <div
                    key={m.id}
                    className="flex min-h-12 min-w-[7.5rem] shrink-0 flex-col justify-center rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {primaryLabel(m)}
                    </span>
                    <span className="text-xs text-slate-600">{formatUnit(m.unit)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tabsPresent.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="category">
              {tabsPresent.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={tab === c}
                  onClick={() => setTab(c)}
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
          ) : (
            <p className="text-sm text-slate-500">
              （无已知分类 Tabs — 常为尚未同步或全部停用；请稍后重试或使用「刷新物料」。）
            </p>
          )}

          {catMaterials.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="group">
              <button
                type="button"
                onClick={() => setChip(null)}
                className={`min-h-9 rounded-full px-3 py-1.5 text-sm ${
                  chip === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
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
                    chip === g ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
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
                {gridItems.map((m) => (
                  <li key={m.id}>
                    <div className="flex min-h-[52px] flex-col justify-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm">
                      <div className="flex items-start gap-2">
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.imageUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                            <Package className="h-4 w-4" aria-hidden />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">
                            {primaryLabel(m)}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {formatUnit(m.unit)}
                            <span className="text-slate-400">
                              {" "}
                              · Δ {m.defaultIncrement}
                            </span>
                          </span>
                        </div>
                      </div>
                      {m.favorite ? (
                        <span className="text-[10px] font-medium text-amber-800">
                          ★ 常用
                        </span>
                      ) : null}
                      {Array.isArray(m.quickAmounts) && m.quickAmounts.length > 0 ? (
                        <span className="text-[10px] text-slate-500">
                          快捷：{m.quickAmounts.join(" / ")}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}

      {devPreview ? (
        <section className="mx-auto w-full max-w-lg">
          <p className="mb-1 text-xs font-medium text-amber-800">Dev：JSON 预览（截断）</p>
          <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-3 text-[11px] text-slate-100">
            {devPreview}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
