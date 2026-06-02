"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import { MaterialSummaryHeader } from "@/components/material-summary-header";
import { useDraftConsumption } from "@/contexts/draft-provider";
import { useMaterials } from "@/hooks/use-materials";
import { usageLabel } from "@/lib/consumption-types";
import { formatUnit } from "@/lib/material-display";
import {
  clampQuantityToGrid,
  effectiveQuickAmounts,
} from "@/lib/quantity-defaults";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export function QuantityContent() {
  const router = useRouter();
  const { draft, setQuantity, changeMaterial, resetDraft } = useDraftConsumption();
  const { getMaterial } = useMaterials();

  const material = draft.materialId ? getMaterial(draft.materialId) : undefined;

  useEffect(() => {
    if (!draft.materialId) {
      router.replace("/");
      return;
    }
    if (!draft.usageType) {
      router.replace("/usage");
    }
  }, [draft.materialId, draft.usageType, router]);

  const increment = material?.defaultIncrement ?? 1;
  const quickAmounts = useMemo(
    () =>
      material
        ? effectiveQuickAmounts({
            unit: material.unit,
            defaultIncrement: material.defaultIncrement,
            quickAmounts: material.quickAmounts,
          })
        : [],
    [material],
  );

  const quantity = useMemo(() => {
    if (draft.quantity !== undefined) {
      return clampQuantityToGrid(draft.quantity, increment);
    }
    return increment;
  }, [draft.quantity, increment]);

  useEffect(() => {
    if (material && draft.quantity === undefined) {
      setQuantity(increment);
    }
  }, [material, draft.quantity, increment, setQuantity]);

  if (!draft.materialId || !draft.usageType || !material) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-600">正在跳转…</p>
      </main>
    );
  }

  const atMin = quantity <= increment;

  function adjust(delta: number) {
    const next = clampQuantityToGrid(quantity + delta, increment);
    setQuantity(next);
  }

  function goReview() {
    setQuantity(quantity);
    router.push("/review");
  }

  return (
    <ConsumptionPageShell
      title="调整数量"
      subtitle={`用途：${usageLabel(draft.usageType)}`}
      backHref="/usage"
      backLabel="← 改选用途"
      showReset
      onReset={resetDraft}
      footer={
        <button
          type="button"
          onClick={goReview}
          className="flex min-h-14 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-base font-semibold text-white hover:bg-blue-700"
        >
          下一步 · 确认
        </button>
      }
    >
      <div className="space-y-6 pb-24">
        <MaterialSummaryHeader material={material} onChange={changeMaterial} />

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">当前数量</p>
          <p className="mt-2 text-5xl font-bold tabular-nums text-slate-900">
            {quantity}
            <span className="ml-2 text-2xl font-semibold text-slate-500">
              {formatUnit(material.unit)}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">步进 ±{increment}</p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => adjust(-increment)}
              disabled={atMin}
              aria-label={`减少 ${increment}`}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-8 w-8" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => adjust(increment)}
              aria-label={`增加 ${increment}`}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="h-8 w-8" aria-hidden />
            </button>
          </div>
        </section>

        {quickAmounts.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">快捷数量</h2>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => {
                const active = quantity === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuantity(amt)}
                    className={`min-h-12 min-w-[3.5rem] rounded-full px-4 text-base font-semibold ${
                      active
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {amt}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <Link
          href="/usage"
          className="block text-center text-sm text-blue-600 hover:underline"
        >
          返回改选用途
        </Link>
      </div>
    </ConsumptionPageShell>
  );
}
