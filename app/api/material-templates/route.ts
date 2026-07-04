import {
  readPackagingTemplates,
  readSupplierNames,
} from "@/lib/material-seed-csv";
import {
  MATERIAL_FORM_CATEGORIES,
  type MaterialFormCategory,
} from "@/lib/material-form-config";
import type {
  MaterialTemplateDto,
  MaterialTemplatesPayload,
} from "@/lib/material-templates-contract";
import { requireAuth } from "@/lib/require-auth-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_UNITS = new Set([
  "ml",
  "g",
  "drops",
  "piece",
  "sheet",
  "roll",
  "cm",
]);

function parseCategory(raw: string | null): MaterialFormCategory | undefined {
  if (
    raw &&
    (MATERIAL_FORM_CATEGORIES as readonly string[]).includes(raw)
  ) {
    return raw as MaterialFormCategory;
  }
  return undefined;
}

function rowToTemplate(
  row: Record<string, string>,
  index: number,
): MaterialTemplateDto | null {
  const category = parseCategory(row.category?.trim() ?? null);
  if (!category) return null;

  const name = row.name?.trim();
  if (!name) return null;

  const unit = row.unit?.trim();
  if (!unit || !ALLOWED_UNITS.has(unit)) return null;

  let defaultIncrement: number | undefined;
  if (row.default_increment?.trim()) {
    const n = Number(row.default_increment);
    if (Number.isInteger(n) && n >= 1) defaultIncrement = n;
  }

  let price: number | undefined;
  if (row.price?.trim()) {
    const p = Number(row.price);
    if (Number.isFinite(p) && p >= 0) price = p;
  }

  return {
    id: String(index),
    name,
    buttonLabel: row.button_label?.trim() || undefined,
    category,
    materialGroup: row.material_group?.trim() || undefined,
    supplier: row.supplier?.trim() || undefined,
    unit,
    defaultIncrement,
    price,
    size: row.size?.trim() || undefined,
    color: row.color?.trim() || undefined,
    capType: row.cap_type?.trim() || undefined,
    packagingType: row.packaging_type?.trim() || undefined,
  };
}

export async function GET(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  const category = parseCategory(new URL(req.url).searchParams.get("category"));
  const suppliers = readSupplierNames();

  const rows = category
    ? readPackagingTemplates(category)
    : readPackagingTemplates();
  const templates = rows
    .map((row, i) => rowToTemplate(row, i))
    .filter((t): t is MaterialTemplateDto => t !== null);

  const body: MaterialTemplatesPayload = {
    suppliers,
    templates,
    sources: {
      suppliers: "airtable/seeds/suppliers.csv",
      templates: "airtable/seeds/materials_packaging.csv",
    },
  };

  return NextResponse.json(body);
}
