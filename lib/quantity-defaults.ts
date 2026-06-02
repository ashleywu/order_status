/**
 * [M3.md](M3.md) / [M4.md](M4.md) shared quantity rules.
 *
 * Strategy for values that are not positive multiples of normalized `defaultIncrement`:
 * **剔除** (drop) — 整库统一，不在响应中保留会破坏「步进网格」的数字。
 */

function asNumberRaw(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/** 整数 ≥ 1 — 与 M1 `default_increment` 语义对齐 */
export function normalizeDefaultIncrement(raw: unknown): number {
  const n = asNumberRaw(raw);
  if (n === null || !Number.isFinite(n)) return 1;
  const floor = Math.floor(n);
  if (floor < 1) return 1;
  return floor;
}

/**
 * Airtable `quick_amounts` 文本 → 仅 **正整数**；非整数 token、非法值丢弃。
 */
export function parseQuickAmountIntTokens(raw: string | undefined): number[] {
  if (!raw || typeof raw !== "string") return [];
  const parts = raw.split(/[,，\s]+/).map((s) => s.trim());
  const out: number[] = [];
  for (const p of parts) {
    if (!p) continue;
    const n = Number(p);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) continue;
    out.push(n);
  }
  return out;
}

/**
 * 当 `quick_amounts` 串解析为空时使用；与 M3/M4 「不得在 route 与 UI 各写魔法数字」一致。
 * 产出值后续仍须经 `defaultIncrement` 倍数过滤。
 */
export function defaultQuickIntsForUnit(unit: string): number[] {
  switch (unit) {
    case "ml":
    case "g":
      return [1, 5, 10, 50, 100];
    case "drops":
      return [1, 5, 10, 20, 50];
    case "piece":
      return [1, 5, 10, 25, 50];
    case "sheet":
      return [1, 5, 10, 25];
    case "roll":
      return [1, 5, 10, 50];
    case "cm":
      return [1, 10, 50, 100, 500];
    default:
      return [1, 5, 10, 50];
  }
}

function uniqSortedInts(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * API 下发的最终 `defaultIncrement` 与 `quickAmounts`（全日整数；每项 ≥ D 且 `value % D === 0`）。
 */
export function finalizeMaterialQuickAmounts(input: {
  unit: string;
  quickAmountsField?: string | undefined;
  /** Airtable `default_increment` 原始值 */
  defaultIncrementRaw: unknown;
}): { defaultIncrement: number; quickAmounts: number[] } {
  const D = normalizeDefaultIncrement(input.defaultIncrementRaw);
  const parsed = parseQuickAmountIntTokens(input.quickAmountsField);

  let candidates: number[];
  if (parsed.length > 0) {
    candidates = parsed;
  } else {
    candidates = defaultQuickIntsForUnit(input.unit);
  }

  const valid = (vals: number[]) =>
    uniqSortedInts(vals.filter((v) => v >= D && v % D === 0));

  let quickAmounts = valid(candidates);

  if (quickAmounts.length === 0 && parsed.length > 0) {
    quickAmounts = valid(defaultQuickIntsForUnit(input.unit));
  }

  return { defaultIncrement: D, quickAmounts };
}

/** Client-side fallback when DTO quickAmounts is empty — same rules as finalize. */
export function effectiveQuickAmounts(input: {
  unit: string;
  defaultIncrement: number;
  quickAmounts: number[];
}): number[] {
  const D = input.defaultIncrement;
  const valid = (vals: number[]) =>
    [...new Set(vals)]
      .filter((v) => v >= D && v % D === 0)
      .sort((a, b) => a - b);

  if (input.quickAmounts.length > 0) {
    const filtered = valid(input.quickAmounts);
    if (filtered.length > 0) return filtered;
  }
  return valid(defaultQuickIntsForUnit(input.unit));
}

export function clampQuantityToGrid(
  quantity: number,
  defaultIncrement: number,
): number {
  const D = defaultIncrement;
  if (!Number.isFinite(quantity) || quantity < D) return D;
  const steps = Math.round(quantity / D);
  return Math.max(D, steps * D);
}
