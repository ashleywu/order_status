"use client";

import type { MaterialDto } from "@/lib/materials-contract";
import { formatUnit, primaryLabel } from "@/lib/material-display";
import { ArrowLeftRight } from "lucide-react";

type MaterialSummaryHeaderProps = {
  material: MaterialDto;
  onChange: () => void;
  backHref?: string;
  backLabel?: string;
};

export function MaterialSummaryHeader({
  material,
  onChange,
  backHref,
  backLabel = "← 返回",
}: MaterialSummaryHeaderProps) {
  return (
    <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            已选物料
          </p>
          <p className="line-clamp-2 text-lg font-semibold text-slate-900">
            {primaryLabel(material)}
          </p>
          <p className="text-sm text-slate-600">{formatUnit(material.unit)}</p>
        </div>
        <button
          type="button"
          onClick={onChange}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          更换
        </button>
      </div>
      {backHref ? (
        <a href={backHref} className="w-fit text-sm text-blue-600 hover:underline">
          {backLabel}
        </a>
      ) : null}
    </header>
  );
}
