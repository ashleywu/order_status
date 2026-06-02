"use client";

import type { MaterialDto } from "@/lib/materials-contract";
import { formatUnit, primaryLabel } from "@/lib/material-display";
import { Package } from "lucide-react";

type MaterialGridButtonProps = {
  material: MaterialDto;
  onSelect: (id: string) => void;
  highlighted?: boolean;
  compact?: boolean;
};

export function MaterialGridButton({
  material: m,
  onSelect,
  highlighted = false,
  compact = false,
}: MaterialGridButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(m.id)}
      className={`flex w-full flex-col justify-center gap-1 rounded-xl border p-3 text-left shadow-sm transition-colors ${
        compact ? "min-h-[52px]" : "min-h-16"
      } ${
        highlighted
          ? "border-2 border-amber-300 bg-amber-50 hover:bg-amber-100"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
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
          <span className="block text-[11px] text-slate-500">{formatUnit(m.unit)}</span>
        </div>
      </div>
      {m.favorite && !compact ? (
        <span className="text-[10px] font-medium text-amber-800">★ 常用</span>
      ) : null}
    </button>
  );
}
