"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import { useDraftConsumption } from "@/contexts/draft-provider";
import { useMaterials } from "@/hooks/use-materials";
import { usageLabel } from "@/lib/consumption-types";
import {
  ensureClientRequestId,
  clearClientRequestIdStorage,
} from "@/lib/client-request-id";
import { postConsumption, voidConsumption } from "@/lib/consumption-client";
import { formatUnit, primaryLabel } from "@/lib/material-display";
import {
  clearLastRecordId,
  readLastRecordId,
  setLastRecordId,
} from "@/lib/last-record-session";
import { recordRecentMaterial } from "@/lib/recent-materials";
import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "review" | "submitting" | "success" | "error" | "voided_replay";

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_quantity":
      return "数量不符合该物料的步进规则，请返回修改。";
    case "material_inactive":
      return "该物料已停用，请重新选择。";
    case "material_not_found":
    case "invalid_material":
      return "物料不存在或无效，请重新选择。";
    case "invalid_usage_type":
      return "用途无效，请返回修改。";
    case "invalid_client_request_id":
      return "提交标识异常，请返回上一步再试。";
    case "rate_limited":
      return "请求过于频繁，请稍后再试。";
    case "schema_mismatch":
      return "Airtable 表字段类型不对，请按 airtable/FIX-CONSUMPTION.txt 修改后重试。";
    case "upstream_error":
      return "服务暂不可用，请稍后重试。";
    default:
      return "提交失败，请重试。";
  }
}

export function ReviewContent() {
  const router = useRouter();
  const { draft, clearDraft, resetDraft } = useDraftConsumption();
  const { getMaterial } = useMaterials();

  const [phase, setPhase] = useState<Phase>("review");
  const [materialError, setMaterialError] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastRecordId, setLastRecordIdState] = useState<string | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [undoDone, setUndoDone] = useState(false);
  const submittingRef = useRef(false);

  const material = draft.materialId ? getMaterial(draft.materialId) : undefined;

  useEffect(() => {
    if (!draft.materialId) {
      router.replace("/");
      return;
    }
    if (!draft.usageType) {
      router.replace("/usage");
      return;
    }
    if (draft.quantity === undefined) {
      router.replace("/quantity");
    }
  }, [draft.materialId, draft.usageType, draft.quantity, router]);

  useEffect(() => {
    if (phase === "review" && draft.materialId && !material) {
      setMaterialError(true);
    }
  }, [phase, draft.materialId, material]);

  useEffect(() => {
    if (
      draft.materialId &&
      draft.usageType &&
      draft.quantity !== undefined &&
      (phase === "review" || phase === "error")
    ) {
      ensureClientRequestId(draft);
    }
  }, [draft, phase]);

  if (!draft.materialId || !draft.usageType || draft.quantity === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-600">正在跳转…</p>
      </main>
    );
  }

  if (materialError || !material) {
    return (
      <ConsumptionPageShell title="无法提交" backHref="/pick" backLabel="← 重选物料">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-lg font-semibold text-red-900">该物料已不可用</p>
          <p className="mt-2 text-sm text-red-800">
            物料可能已停用或已从列表移除，请重新选择。
          </p>
          <Link
            href="/pick"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
          >
            返回选择物料
          </Link>
        </div>
      </ConsumptionPageShell>
    );
  }

  async function submit() {
    if (submittingRef.current) return;
    if (!draft.materialId || !draft.usageType || draft.quantity === undefined) return;
    if (!getMaterial(draft.materialId)) {
      setMaterialError(true);
      return;
    }

    const clientRequestId = ensureClientRequestId(draft);
    if (!clientRequestId) {
      setErrorText("草稿不完整，请返回修改。");
      setPhase("error");
      return;
    }

    submittingRef.current = true;
    setPhase("submitting");
    setErrorText(null);

    try {
      const result = await postConsumption({
        materialId: draft.materialId,
        usageType: draft.usageType,
        quantity: draft.quantity,
        clientRequestId,
        occurredAt: new Date().toISOString(),
      });

      if (result.voided) {
        clearClientRequestIdStorage();
        clearDraft();
        setPhase("voided_replay");
        return;
      }

      recordRecentMaterial(draft.materialId);
      setLastRecordId(result.recordId);
      setLastRecordIdState(result.recordId);
      clearClientRequestIdStorage();
      clearDraft();
      setPhase("success");
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      const code = err.code ?? err.message;
      setErrorText(errorMessage(code));
      setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  async function undoLast() {
    const id = lastRecordId ?? readLastRecordId();
    if (!id || undoBusy || undoDone) return;
    setUndoBusy(true);
    try {
      await voidConsumption(id);
      clearLastRecordId();
      setUndoDone(true);
    } catch (e) {
      const err = e as Error & { code?: string; status?: number };
      if (err.code === "already_voided" || err.status === 409) {
        clearLastRecordId();
        setUndoDone(true);
      } else {
        setErrorText(errorMessage(err.code));
      }
    } finally {
      setUndoBusy(false);
    }
  }

  if (phase === "voided_replay") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-slate-900">无法重复提交</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            这条提交之前已被撤销，请重新开始一条新记录。
          </p>
        </div>
        <Link
          href="/"
          className="flex min-h-14 w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-6 text-base font-semibold text-white hover:bg-blue-700"
        >
          回首页
        </Link>
        <Link
          href="/pick"
          className="text-sm text-blue-600 hover:underline"
        >
          或选择物料
        </Link>
      </main>
    );
  }

  if (phase === "success") {
    const showUndo = !!lastRecordId && !undoDone;
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <CheckCircle2 className="h-20 w-20 text-emerald-600" aria-hidden />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">已记录</h1>
          <p className="mt-2 text-sm text-slate-600">消耗已成功写入。</p>
        </div>
        {showUndo ? (
          <button
            type="button"
            onClick={() => void undoLast()}
            disabled={undoBusy}
            className="flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 text-base font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          >
            {undoBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Undo2 className="h-5 w-5" aria-hidden />
            )}
            撤销上一笔
          </button>
        ) : undoDone ? (
          <p role="status" className="text-sm font-medium text-slate-600">
            已撤销
          </p>
        ) : null}
        {errorText ? (
          <p role="alert" className="text-sm text-red-600">
            {errorText}
          </p>
        ) : null}
        <Link
          href="/"
          className="flex min-h-14 w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-6 text-base font-semibold text-white hover:bg-blue-700"
        >
          再记一笔
        </Link>
      </main>
    );
  }

  const nowLine = new Date().toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ConsumptionPageShell
      title="确认提交"
      backHref="/quantity"
      backLabel="← 返回改数量"
      showReset
      onReset={resetDraft}
      footer={
        phase === "review" || phase === "error" ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              提交记录
            </button>
            <Link
              href="/quantity"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              返回修改
            </Link>
          </div>
        ) : (
          <div className="flex min-h-14 items-center justify-center gap-2 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            提交中…
          </div>
        )
      }
    >
      <div className="space-y-4 pb-28">
        {phase === "error" && errorText ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <p className="font-semibold">{errorText}</p>
            {(errorText.includes("物料") || errorText.includes("停用")) && (
              <Link href="/pick" className="mt-2 inline-block font-medium underline">
                前往选择物料
              </Link>
            )}
            {errorText.includes("数量") && (
              <Link href="/quantity" className="mt-2 inline-block font-medium underline">
                返回改数量
              </Link>
            )}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                物料
              </dt>
              <dd className="line-clamp-2 text-lg font-semibold text-slate-900">
                {primaryLabel(material)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                用途
              </dt>
              <dd className="text-lg font-semibold text-slate-900">
                {usageLabel(draft.usageType)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                数量
              </dt>
              <dd className="text-lg font-semibold text-slate-900">
                {draft.quantity} {formatUnit(material.unit)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                时间
              </dt>
              <dd className="text-base text-slate-700">{nowLine}</dd>
            </div>
          </dl>
        </section>
      </div>
    </ConsumptionPageShell>
  );
}
