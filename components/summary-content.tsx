"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import { useMaterials } from "@/hooks/use-materials";
import type {
  ConsumptionLogDto,
  ConsumptionLogPeriod,
} from "@/lib/consumption-logs-contract";
import { fetchConsumptionLogs } from "@/lib/consumption-logs-client";
import { USAGE_OPTIONS, usageLabel, type UsageType } from "@/lib/consumption-types";
import { formatUnit, syncLine } from "@/lib/material-display";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const PERIOD_OPTIONS: { value: ConsumptionLogPeriod; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

type GroupMode = "list" | "usage" | "materialGroup";

function chipClass(active: boolean): string {
  return active
    ? "border-blue-600 bg-blue-600 text-white"
    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
}

function groupLogs(
  logs: ConsumptionLogDto[],
  mode: GroupMode,
): { key: string; label: string; logs: ConsumptionLogDto[]; totalQty: number }[] {
  if (mode === "list") {
    const totalQty = logs.reduce((s, l) => s + l.quantity, 0);
    return [{ key: "all", label: "全部", logs, totalQty }];
  }

  const map = new Map<string, ConsumptionLogDto[]>();
  for (const log of logs) {
    const key =
      mode === "usage"
        ? log.usageType
        : log.materialGroup || "未分组";
    const bucket = map.get(key) ?? [];
    bucket.push(log);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([key, items]) => {
      const label =
        mode === "usage" ? usageLabel(key as UsageType) : key;
      const totalQty = items.reduce((s, l) => s + l.quantity, 0);
      return {
        key,
        label,
        logs: items.sort(
          (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
        ),
        totalQty,
      };
    })
    .sort((a, b) => b.logs.length - a.logs.length);
}

export function SummaryContent() {
  const { data: materialsData } = useMaterials();
  const [period, setPeriod] = useState<ConsumptionLogPeriod>("today");
  const [usageType, setUsageType] = useState<UsageType | "">("");
  const [materialGroup, setMaterialGroup] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("list");
  const [logs, setLogs] = useState<ConsumptionLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of materialsData?.materials ?? []) {
      if (m.group) set.add(m.group);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [materialsData?.materials]);

  const materialOptions = useMemo(() => {
    return [...(materialsData?.materials ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "zh-CN"),
    );
  }, [materialsData?.materials]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await fetchConsumptionLogs({
        period,
        usageType: usageType || undefined,
        materialGroup: materialGroup || undefined,
        materialId: materialId || undefined,
      });
      setLogs(body.logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [period, usageType, materialGroup, materialId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () => groupLogs(logs, groupMode),
    [logs, groupMode],
  );

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  return (
    <ConsumptionPageShell
      title="消耗记录"
      subtitle={`${periodLabel} · 不含已撤销`}
      backHref="/"
      backLabel="← 回首页"
    >
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${chipClass(period === p.value)}`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="ml-auto flex min-h-10 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            刷新
          </button>
        </div>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            用途
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUsageType("")}
              className={`min-h-9 rounded-lg border px-3 text-sm font-medium ${chipClass(usageType === "")}`}
            >
              全部
            </button>
            {USAGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setUsageType(o.value)}
                className={`min-h-9 rounded-lg border px-3 text-sm font-medium ${chipClass(usageType === o.value)}`}
              >
                {o.shortLabel}
              </button>
            ))}
          </div>
        </section>

        {groupOptions.length > 0 ? (
          <section className="space-y-2">
            <label
              htmlFor="summary-group"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              物料分组
            </label>
            <select
              id="summary-group"
              value={materialGroup}
              onChange={(e) => setMaterialGroup(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
            >
              <option value="">全部分组</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        {materialOptions.length > 0 ? (
          <section className="space-y-2">
            <label
              htmlFor="summary-material"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              指定物料
            </label>
            <select
              id="summary-material"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
            >
              <option value="">全部物料</option>
              {materialOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.buttonLabel || m.name}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            显示方式
          </h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["list", "列表"],
                ["usage", "按用途"],
                ["materialGroup", "按分组"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGroupMode(mode)}
                className={`min-h-9 rounded-lg border px-3 text-sm font-medium ${chipClass(groupMode === mode)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            {error}
          </div>
        ) : null}

        {loading && logs.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
        ) : null}

        {!loading && !error && logs.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            当前筛选下没有消耗记录。
          </p>
        ) : null}

        {logs.length > 0 ? (
          <p className="text-sm font-medium text-slate-700">
            共 {logs.length} 条记录
          </p>
        ) : null}

        <div className="space-y-6">
          {grouped.map((section) => (
            <section key={section.key} className="space-y-3">
              {groupMode !== "list" ? (
                <h3 className="text-sm font-semibold text-slate-800">
                  {section.label}
                  <span className="ml-2 font-normal text-slate-500">
                    {section.logs.length} 条
                  </span>
                </h3>
              ) : null}
              <ul className="space-y-2">
                {section.logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {log.materialName}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {usageLabel(log.usageType)}
                          {groupMode === "list" ? (
                            <span className="text-slate-400"> · {log.materialGroup}</span>
                          ) : null}
                        </p>
                      </div>
                      <p className="shrink-0 text-right font-semibold text-slate-900">
                        {log.quantity}{" "}
                        <span className="text-sm font-normal text-slate-600">
                          {formatUnit(log.unit)}
                        </span>
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {syncLine(log.occurredAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </ConsumptionPageShell>
  );
}
