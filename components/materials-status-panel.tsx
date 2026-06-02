"use client";

import { syncLine } from "@/lib/material-display";
import { Loader2, LogIn, RefreshCw } from "lucide-react";
import Link from "next/link";

type MaterialsStatusPanelProps = {
  loading: boolean;
  error: string | null;
  showingStaleCache: boolean;
  generatedAt?: string;
  justUpdated?: boolean;
  onRefresh: () => void;
};

export function MaterialsStatusPanel({
  loading,
  error,
  showingStaleCache,
  generatedAt,
  justUpdated,
  onRefresh,
}: MaterialsStatusPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onRefresh}
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

      {generatedAt ? (
        <p className="text-xs font-medium text-slate-700">
          上次同步：
          <time dateTime={generatedAt}>{syncLine(generatedAt)}</time>
        </p>
      ) : null}

      {showingStaleCache ? (
        <div
          role="status"
          className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <strong>未能连接服务器</strong>——以下为<strong>上次成功同步</strong>
          的快照。
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
            onClick={onRefresh}
          >
            重试
          </button>
        </div>
      ) : null}
    </div>
  );
}

type MaterialsGateProps = {
  loading: boolean;
  error: string | null;
  materialCount: number;
  showingStaleCache: boolean;
  hasFetchedSuccessfully: boolean;
  onRetry: () => void;
};

export function MaterialsGate({
  loading,
  error,
  materialCount,
  showingStaleCache,
  hasFetchedSuccessfully,
  onRetry,
}: MaterialsGateProps) {
  const fatalNoData =
    !loading &&
    !!error &&
    materialCount === 0 &&
    !showingStaleCache;

  const bootstrap =
    loading && materialCount === 0 && !showingStaleCache && !error && !fatalNoData;

  const httpEmpty =
    !loading &&
    !error &&
    materialCount === 0 &&
    hasFetchedSuccessfully;

  if (bootstrap) {
    return (
      <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden />
        <p className="text-center text-base font-medium text-slate-800">
          正在载入物料…
        </p>
        <p className="text-center text-xs text-slate-500">请稍候，勿关闭页面。</p>
      </section>
    );
  }

  if (fatalNoData) {
    return (
      <section className="mx-auto w-full max-w-lg space-y-4 rounded-xl border-2 border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">无法载入物料列表</h2>
        <p className="text-sm text-slate-600">
          {error ??
            "请检查网络或服务配置后重试。若会话已过期，请先登录——否则可能出现「看似有列表但已过时」的假状态。"}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
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
    );
  }

  if (httpEmpty) {
    return (
      <section className="mx-auto w-full max-w-lg rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-700">
        <p className="text-lg font-semibold">暂无可用物料</p>
        <p className="mt-2 text-sm leading-relaxed">
          服务端未返回任何 active 记录。请到 Airtable 勾选 Active；若之前有数据而如今为零，也可能已全部停用或暂无——可再点击「刷新物料」确认。
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          刷新物料
        </button>
      </section>
    );
  }

  return null;
}
