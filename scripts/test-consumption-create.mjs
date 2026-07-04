/**
 * Smoke test consumption POST with BOM material + date occurred_at.
 * Run: node scripts/test-consumption-create.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(join(root, ".env.local"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const { AIRTABLE_PAT: pat, AIRTABLE_BASE_ID: baseId, AIRTABLE_MATERIALS_TABLE: matTable, AIRTABLE_CONSUMPTION_TABLE: logTable } = env;
const host = `https://api.airtable.com/v0/${baseId}`;
const BOM = "\ufeff";

function resolveFieldNameFromList(names, preferred) {
  if (names.includes(preferred)) return preferred;
  const bom = BOM + preferred;
  if (names.includes(bom)) return bom;
  const m = names.find((n) => (n.startsWith(BOM) ? n.slice(1) : n) === preferred);
  return m ?? preferred;
}

function findTable(tables, wanted) {
  return (
    tables.find((t) => t.name === wanted || t.id === wanted) ??
    tables.find((t) => t.name.toLowerCase() === wanted.toLowerCase())
  );
}

const meta = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
  headers: { Authorization: `Bearer ${pat}` },
}).then((r) => r.json());

const logMeta = findTable(meta.tables, logTable);
const matMeta = findTable(meta.tables, matTable);
const logFields = logMeta.fields.map((f) => f.name);
const occurredType = logMeta.fields.find((f) => f.name.replace(BOM, "") === "occurred_at")?.type;
const keys = {
  material: resolveFieldNameFromList(logFields, "material"),
  usage_type: resolveFieldNameFromList(logFields, "usage_type"),
  quantity: resolveFieldNameFromList(logFields, "quantity"),
  occurred_at: resolveFieldNameFromList(logFields, "occurred_at"),
  client_request_id: resolveFieldNameFromList(logFields, "client_request_id"),
  voided: resolveFieldNameFromList(logFields, "voided"),
};
console.log("Resolved consumption keys:", keys);
console.log("occurred_at type:", occurredType);

const mats = await fetch(`${host}/${encodeURIComponent(matTable)}?pageSize=100`, {
  headers: { Authorization: `Bearer ${pat}` },
}).then((r) => r.json());
const abc = mats.records?.find((r) => (r.fields[BOM + "name"] || r.fields.name) === "abc");
if (!abc) {
  console.error("Material abc not found");
  process.exit(1);
}

const iso = new Date().toISOString();
const occurredAt = occurredType === "date" ? iso.slice(0, 10) : iso;
const clientRequestId = "00000000-0000-4000-8000-000000000077";

const fields = {
  [keys.material]: [abc.id],
  [keys.usage_type]: "custom",
  [keys.quantity]: 4,
  [keys.occurred_at]: occurredAt,
  [keys.client_request_id]: clientRequestId,
  [keys.voided]: false,
};

const create = await fetch(`${host}/${encodeURIComponent(logTable)}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
  body: JSON.stringify({ fields }),
});
const data = await create.json();
console.log("CREATE:", create.status, data.error?.message || data.id);
if (create.status !== 200) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("OK — consumption submit should work in App now");
