"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import { MaterialSummaryHeader } from "@/components/material-summary-header";
import { useDraftConsumption } from "@/contexts/draft-provider";
import { useMaterials } from "@/hooks/use-materials";
import { USAGE_OPTIONS } from "@/lib/consumption-types";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function UsageContent() {
  const router = useRouter();
  const { draft, selectUsage, changeMaterial, resetDraft } = useDraftConsumption();
  const { getMaterial } = useMaterials();

  const material = draft.materialId ? getMaterial(draft.materialId) : undefined;

  useEffect(() => {
    if (!draft.materialId) {
      router.replace("/");
    }
  }, [draft.materialId, router]);

  if (!draft.materialId || !material) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-600">正在跳转…</p>
      </main>
    );
  }

  return (
    <ConsumptionPageShell
      title="选择用途"
      backHref="/"
      backLabel="← 首页"
      showReset
      onReset={resetDraft}
    >
      <div className="space-y-5">
        <MaterialSummaryHeader material={material} onChange={changeMaterial} />

        <div className="grid grid-cols-2 gap-3">
          {USAGE_OPTIONS.map((opt) => {
            const selected = draft.usageType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectUsage(opt.value)}
                className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-4 text-center font-semibold transition-colors ${
                  selected
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {selected ? (
                  <Check className="h-5 w-5 text-blue-600" aria-hidden />
                ) : (
                  <span className="h-5" aria-hidden />
                )}
                <span className="text-base leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </ConsumptionPageShell>
  );
}
