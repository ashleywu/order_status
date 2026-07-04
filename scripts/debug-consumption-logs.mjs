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

const host = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}`;
const h = { Authorization: `Bearer ${env.AIRTABLE_PAT}` };
const table = env.AIRTABLE_CONSUMPTION_TABLE;
const BOM = "\ufeff";

const all = await fetch(`${host}/${encodeURIComponent(table)}`, { headers: h }).then(
  (r) => r.json(),
);
console.log("Total records:", all.records?.length);
for (const r of all.records ?? []) {
  console.log("---", r.id);
  console.log("fields keys:", Object.keys(r.fields));
  console.log("material link:", r.fields.material ?? r.fields[BOM + "material"]);
  console.log("usage_type:", r.fields.usage_type);
  console.log("quantity:", r.fields.quantity);
  console.log("occurred_at:", r.fields.occurred_at);
  console.log("voided:", r.fields.voided);
}

const formulas = [
  ["occurred_at today", "IS_SAME({occurred_at}, TODAY(), 'day')"],
  ["material field in filter", '{material}="rec3T0L3hXqzh12Fd"'],
  [
    "BOM material filter",
    `{${BOM}material}="rec3T0L3hXqzh12Fd"`,
  ],
];

for (const [label, formula] of formulas) {
  const res = await fetch(
    `${host}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(formula)}`,
    { headers: h },
  ).then((r) => r.json());
  console.log(
    label,
    ":",
    res.records?.length ?? 0,
    res.error?.message ?? "ok",
  );
}
