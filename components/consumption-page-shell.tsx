"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

type ConsumptionPageShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showReset?: boolean;
  onReset?: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function ConsumptionPageShell({
  title,
  subtitle,
  backHref,
  backLabel = "← 返回",
  showReset = false,
  onReset,
  children,
  footer,
}: ConsumptionPageShellProps) {
  return (
    <main className="flex min-h-dvh flex-col gap-5 px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <header className="mx-auto flex w-full max-w-lg flex-col gap-2">
        {backHref ? (
          <a href={backHref} className="w-fit text-sm text-blue-600 hover:underline">
            {backLabel}
          </a>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {showReset && onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              重置
            </button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1">{children}</div>

      {footer ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto w-full max-w-lg">{footer}</div>
        </div>
      ) : null}
    </main>
  );
}
