"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import { useMaterials } from "@/hooks/use-materials";
import type {
  ConsumptionLogDto,
  ConsumptionLogPeriod,
} from "@/lib/consumption-logs-contract";
import { fetchConsumptionLogs } from "@/lib/consumption-logs-client";
import {
  aggregateConsumptionLogs,
  groupAggregatedRows,
  summaryStats,
  type SummaryGroupMode,
} from "@/lib/consumption-logs-aggregate";
import { USAGE_OPTIONS, usageLabel, type UsageType } from "@/lib/consumption-types";
import { formatUnit, syncLine } from "@/lib/material-display";
import { formatMoney } from "@/lib/airtable-field-value";
import { MATERIAL_GROUP_OPTIONS } from "@/lib/material-groups";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const PERIOD_OPTIONS: { value: ConsumptionLogPeriod; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

type GroupMode = SummaryGroupMode;

function chipClass(active: boolean): string {
  return active
    ? "border-blue-600 bg-blue-600 text-white"
    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
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

  const groupOptions = useMemo(() => [...MATERIAL_GROUP_OPTIONS], []);

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

  const aggregated = useMemo(() => aggregateConsumptionLogs(logs), [logs]);
  const grouped = useMemo(
    () => groupAggregatedRows(aggregated, groupMode),
    [aggregated, groupMode],
  );
  const stats = useMemo(
    () => summaryStats(logs, aggregated),
    [logs, aggregated],
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
                ["list", "汇总"],
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
          <div className="space-y-1 text-sm font-medium text-slate-700">
            <p>
              {stats.rawCount} 笔记录，汇总为 {stats.aggregatedCount} 项
            </p>
            {stats.totalAmount !== null ? (
              <p className="text-base font-semibold text-slate-900">
                金额合计：{formatMoney(stats.totalAmount)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                物料未填 Price 时无法计算金额
              </p>
            )}
          </div>
        ) : null}

        <div className="space-y-6">
          {grouped.map((section) => (
            <section key={section.key} className="space-y-3">
              {groupMode !== "list" ? (
                <h3 className="text-sm font-semibold text-slate-800">
                  {section.label}
                  <span className="ml-2 font-normal text-slate-500">
                    {section.rows.length} 项
                    {section.rows.some((r) => r.totalAmount !== null) ? (
                      <>
                        {" "}
                        · 小计{" "}
                        {formatMoney(
                          section.rows.reduce(
                            (s, r) => s + (r.totalAmount ?? 0),
                            0,
                          ),
                        )}
                      </>
                    ) : null}
                  </span>
                </h3>
              ) : null}
              <ul className="space-y-2">
                {section.rows.map((row) => (
                  <li
                    key={row.key}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {row.materialName}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {usageLabel(row.usageType)}
                          {groupMode === "list" ? (
                            <span className="text-slate-400"> · {row.materialGroup}</span>
                          ) : null}
                          {row.entryCount > 1 ? (
                            <span className="text-slate-400"> · {row.entryCount} 笔</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-slate-900">
                          {row.totalQuantity}{" "}
                          <span className="text-sm font-normal text-slate-600">
                            {formatUnit(row.unit)}
                          </span>
                        </p>
                        {row.unitPrice !== null ? (
                          <p className="mt-1 text-sm text-slate-600">
                            @{formatMoney(row.unitPrice)} / {formatUnit(row.unit)}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-base font-semibold text-emerald-800">
                          {formatMoney(row.totalAmount)}
                        </p>
                      </div>
                    </div>
                    {row.entryCount === 1 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {syncLine(row.lastOccurredAt)}
                      </p>
                    ) : null}
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
