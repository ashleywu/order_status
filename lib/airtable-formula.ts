/** Escape user input embedded in Airtable `filterByFormula` string literals. */
export function escapeAirtableFormulaString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
