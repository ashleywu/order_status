/** Read numeric Airtable fields (exact or case-insensitive key, incl. BOM prefix). */
export function readNumericField(
  fields: Record<string, unknown>,
  preferred: string,
): number | null {
  let raw: unknown;
  for (const [key, value] of Object.entries(fields)) {
    const normalized = key.replace(/^\uFEFF/, "").toLowerCase();
    if (normalized === preferred.toLowerCase()) {
      raw = value;
      break;
    }
  }
  if (raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }
  return amount.toFixed(2);
}
