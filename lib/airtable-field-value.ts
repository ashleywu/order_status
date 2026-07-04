/** Read any Airtable field (exact, BOM prefix, or case-insensitive key). */
export function readFieldValue(
  fields: Record<string, unknown>,
  preferred: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(fields, preferred)) {
    return fields[preferred];
  }
  const bom = `\uFEFF${preferred}`;
  if (Object.prototype.hasOwnProperty.call(fields, bom)) {
    return fields[bom];
  }
  for (const [key, value] of Object.entries(fields)) {
    const normalized = key.replace(/^\uFEFF/, "").toLowerCase();
    if (normalized === preferred.toLowerCase()) return value;
  }
  return undefined;
}

/** Read numeric Airtable fields (exact or case-insensitive key, incl. BOM prefix). */
export function readNumericField(
  fields: Record<string, unknown>,
  preferred: string,
): number | null {
  const raw = readFieldValue(fields, preferred);
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
