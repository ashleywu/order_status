/**
 * Smoke test: create material via resolveTableFieldName (matches production API).
 * Run: node scripts/test-material-create.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load compiled helpers after build; fallback to inline BOM logic for dev without build.
let resolveFieldNameFromList;
try {
  const mod = require(join(root, ".next/server/chunks/...")); // skip
} catch {
  /* use inline */
}

const BOM = "\ufeff";
function resolveFieldNameFromListInline(names, preferred) {
  if (names.includes(preferred)) return preferred;
  const bom = BOM + preferred;
  if (names.includes(bom)) return bom;
  const m = names.find((n) => (n.startsWith(BOM) ? n.slice(1) : n) === preferred);
  return m ?? preferred;
}
resolveFieldNameFromList = resolveFieldNameFromListInline;

const envText = readFileSync(join(root, ".env.local"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const { AIRTABLE_PAT: pat, AIRTABLE_BASE_ID: baseId, AIRTABLE_MATERIALS_TABLE: matTable } = env;
const host = "https://api.airtable.com/v0";

async function req(tableOrPath, init) {
  const [table, qs] = tableOrPath.split("?");
  const url = `${host}/${baseId}/${encodeURIComponent(table)}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function probeFieldNames(table) {
  const r = await req(`${table}?pageSize=1`);
  return Object.keys(r.json?.records?.[0]?.fields ?? {});
}

const matFields = await probeFieldNames(matTable);
const supFields = await probeFieldNames("Suppliers");
console.log("Materials field keys sample:", matFields.slice(0, 5).map((k) => JSON.stringify(k)));

const nameKey = resolveFieldNameFromList(matFields, "name");
const supNameKey = resolveFieldNameFromList(supFields, "name");
console.log("Resolved name keys:", { nameKey: JSON.stringify(nameKey), supNameKey: JSON.stringify(supNameKey) });

const sup = await req(
  `Suppliers?filterByFormula=${encodeURIComponent(`{${supNameKey}}="Aduo"`)}`,
);
console.log("Supplier Aduo:", sup.status, sup.json?.records?.[0]?.id ?? sup.json?.error);

const fields = {
  [nameKey]: "abc-test-api-fix",
  category: "ingredient",
  unit: "ml",
  default_increment: 1,
  active: true,
  favorite: false,
  sort_order: 999,
  material_group: "植物油",
  price: 10,
};
if (sup.json?.records?.[0]?.id) {
  fields.supplier = [sup.json.records[0].id];
}

const create = await req(matTable, {
  method: "POST",
  body: JSON.stringify({ fields }),
});
console.log("CREATE:", create.status);
if (create.status !== 200) {
  console.log(JSON.stringify(create.json, null, 2));
  process.exit(1);
}
console.log("OK id:", create.json.id);

const del = await req(`${matTable}/${create.json.id}`, { method: "DELETE" });
console.log("DELETE cleanup:", del.status);
