"use client";

import { ConsumptionPageShell } from "@/components/consumption-page-shell";
import {
  CAP_TYPE_OPTIONS,
  DEFAULT_UNIT_BY_CATEGORY,
  UNIT_OPTIONS,
  type MaterialCreateBody,
  categoryShowsBottleSpecs,
  categoryShowsPackagingSpecs,
} from "@/lib/material-form-config";
import {
  MATERIAL_GROUP_OPTIONS,
  categoryForMaterialGroup,
} from "@/lib/material-groups";
import type { MaterialTemplateDto } from "@/lib/material-templates-contract";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const CUSTOM_TEMPLATE_ID = "__custom__";

function errorText(code: string): string {
  switch (code) {
    case "invalid_name":
      return "请填写物料名称。";
    case "invalid_price":
      return "价格须为不小于 0 的数字。";
    case "invalid_unit":
      return "单位在 Airtable 的 unit 单选里不存在，请改选 ml 等已有选项，或在 Airtable 添加该单位。";
    case "missing_price_field":
      return "Airtable 的 Materials 表还没有 price 字段，请先在 Airtable 添加 Number 类型的 price 列。";
    case "upstream_error":
      return "写入 Airtable 失败，请稍后重试。";
    default:
      return "保存失败，请检查填写内容。";
  }
}

function applyTemplateToForm(
  t: MaterialTemplateDto,
  setters: {
    setName: (v: string) => void;
    setSupplier: (v: string) => void;
    setPrice: (v: string) => void;
    setMaterialGroup: (v: string) => void;
    setUnit: (v: string) => void;
    setDefaultIncrement: (v: string) => void;
    setSize: (v: string) => void;
    setColor: (v: string) => void;
    setCapType: (v: string) => void;
  },
) {
  setters.setName(t.name);
  setters.setSupplier(t.supplier ?? "");
  setters.setPrice(t.price !== undefined ? String(t.price) : "");
  if (t.materialGroup?.trim()) {
    setters.setMaterialGroup(t.materialGroup.trim());
  }
  setters.setUnit(t.unit);
  setters.setDefaultIncrement(String(t.defaultIncrement ?? 1));
  setters.setSize(t.size ?? "");
  setters.setColor(t.color ?? "");
  setters.setCapType(t.capType ?? "");
}

export function MaterialFormContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [materialGroup, setMaterialGroup] = useState<string>("精油");
  const [unit, setUnit] = useState(DEFAULT_UNIT_BY_CATEGORY.ingredient);
  const [defaultIncrement, setDefaultIncrement] = useState("1");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [capType, setCapType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [allTemplates, setAllTemplates] = useState<MaterialTemplateDto[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);

  const derivedCategory = useMemo(
    () => categoryForMaterialGroup(materialGroup),
    [materialGroup],
  );

  const templates = useMemo(
    () =>
      allTemplates.filter((t) => {
        if (t.materialGroup?.trim()) {
          return t.materialGroup.trim() === materialGroup;
        }
        return t.category === derivedCategory;
      }),
    [allTemplates, materialGroup, derivedCategory],
  );

  const resetFieldsForGroup = useCallback((nextGroup: string) => {
    const cat = categoryForMaterialGroup(nextGroup);
    setUnit(DEFAULT_UNIT_BY_CATEGORY[cat]);
    setDefaultIncrement("1");
    setCapType("");
    setSize("");
    setColor("");
    setName("");
    setSupplier("");
    setPrice("");
    setTemplateId("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/material-templates", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as {
          suppliers?: string[];
          templates?: MaterialTemplateDto[];
        };
        if (cancelled) return;
        setSuppliers(data.suppliers ?? []);
        setAllTemplates(data.templates ?? []);
      } catch {
        if (!cancelled) {
          setSuppliers([]);
          setAllTemplates([]);
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onMaterialGroupChange(next: string) {
    setMaterialGroup(next);
    resetFieldsForGroup(next);
  }

  function onTemplatePick(id: string) {
    setTemplateId(id);
    if (id === CUSTOM_TEMPLATE_ID || id === "") {
      setName("");
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    applyTemplateToForm(t, {
      setName,
      setSupplier,
      setPrice,
      setMaterialGroup,
      setUnit,
      setDefaultIncrement,
      setSize,
      setColor,
      setCapType,
    });
  }

  const useTemplateSelect = templates.length > 0;
  const useSupplierSelect = suppliers.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: MaterialCreateBody = {
        name,
        category: derivedCategory,
        supplier: supplier.trim() || undefined,
        price: price.trim() === "" ? undefined : Number(price),
        materialGroup: materialGroup.trim() || undefined,
        unit,
        defaultIncrement: Number(defaultIncrement) || 1,
      };
      if (categoryShowsBottleSpecs(derivedCategory)) {
        body.size = size.trim() || undefined;
        body.color = color.trim() || undefined;
        body.capType = capType.trim() || undefined;
      }
      if (categoryShowsPackagingSpecs(derivedCategory)) {
        body.size = size.trim() || undefined;
        body.color = color.trim() || undefined;
      }

      const res = await fetch("/api/materials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(errorText(data.error ?? "submit_failed"));
        return;
      }

      setSuccess(true);
      window.setTimeout(() => router.push("/pick"), 1200);
    } catch {
      setError("网络错误，请重试。");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <ConsumptionPageShell title="已保存" backHref="/" backLabel="← 回首页">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-900">物料已写入 Airtable</p>
          <p className="mt-2 text-sm text-emerald-800">正在跳转到选料页…</p>
        </div>
      </ConsumptionPageShell>
    );
  }

  return (
    <ConsumptionPageShell
      title="新增物料"
      subtitle="模板来自 airtable/seeds/*.csv，保存写入 Airtable"
      backHref="/"
      backLabel="← 回首页"
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5 pb-8">
        <Field label="物料分组 material_group *" htmlFor="mat-group">
          <select
            id="mat-group"
            required
            value={materialGroup}
            onChange={(e) => onMaterialGroupChange(e.target.value)}
            className={inputClass}
          >
            {MATERIAL_GROUP_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        {optionsLoading ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在加载 CSV 模板…
          </p>
        ) : null}

        {useTemplateSelect ? (
          <Field label="从 CSV 选择模板 *" htmlFor="mat-template">
            <select
              id="mat-template"
              required
              value={templateId}
              onChange={(e) => onTemplatePick(e.target.value)}
              className={inputClass}
            >
              <option value="">— 请选择 —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value={CUSTOM_TEMPLATE_ID}>自定义（手动填写名称）</option>
            </select>
            <p className="text-xs text-slate-500">
              数据来自 materials_packaging.csv（同 material_group 行）
            </p>
          </Field>
        ) : null}

        <Field label="名称 *" htmlFor="mat-name">
          {useTemplateSelect && templateId !== CUSTOM_TEMPLATE_ID && templateId ? (
            <input
              id="mat-name"
              readOnly
              value={name}
              className={`${inputClass} bg-slate-50`}
            />
          ) : (
            <input
              id="mat-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder={
                useTemplateSelect
                  ? "请先选模板，或选「自定义」"
                  : "手动输入名称"
              }
            />
          )}
        </Field>

        <Field label="Supplier 供应商" htmlFor="mat-supplier">
          {useSupplierSelect ? (
            <select
              id="mat-supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="mat-supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={inputClass}
              placeholder="suppliers.csv 为空时可手输"
            />
          )}
        </Field>

        <Field label="Price 价格" htmlFor="mat-price">
          <input
            id="mat-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="单位 unit *" htmlFor="mat-unit">
            <select
              id="mat-unit"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={inputClass}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="步进 default_increment" htmlFor="mat-inc">
            <input
              id="mat-inc"
              type="number"
              min={1}
              step={1}
              value={defaultIncrement}
              onChange={(e) => setDefaultIncrement(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {categoryShowsBottleSpecs(derivedCategory) ? (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Bottle 规格</h3>
            <Field label="Size 规格" htmlFor="mat-size">
              <input
                id="mat-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputClass}
                placeholder="例如 30ml"
              />
            </Field>
            <Field label="Color 颜色" htmlFor="mat-color">
              <input
                id="mat-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputClass}
                placeholder="例如 琥珀色"
              />
            </Field>
            <Field label="Lid / Cap Type 盖型" htmlFor="mat-cap">
              <select
                id="mat-cap"
                value={capType}
                onChange={(e) => setCapType(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {CAP_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </section>
        ) : null}

        {categoryShowsPackagingSpecs(derivedCategory) ? (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Packaging 规格</h3>
            <Field label="Size 规格" htmlFor="mat-pkg-size">
              <input
                id="mat-pkg-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputClass}
                placeholder="例如 大号"
              />
            </Field>
            <Field label="Color 颜色" htmlFor="mat-pkg-color">
              <input
                id="mat-pkg-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputClass}
                placeholder="例如 牛皮色"
              />
            </Field>
          </section>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
          保存到 Airtable
        </button>

        <Link
          href="/pick"
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          取消
        </Link>
      </form>
    </ConsumptionPageShell>
  );
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none ring-blue-500 focus:ring-2";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
