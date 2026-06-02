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
const host = "https://api.airtable.com/v0";

async function req(tableOrPath, init) {
  const path = tableOrPath.includes("?")
    ? tableOrPath
    : encodeURIComponent(tableOrPath);
  const res = await fetch(`${host}/${baseId}/${path}`, {
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

console.log("Base:", baseId);
console.log("Materials table:", matTable);
console.log("Consumption table:", logTable);
console.log("---");

const mats = await req(`${matTable}?pageSize=3&filterByFormula=${encodeURIComponent("{active}=TRUE()")}`);
console.log("GET Materials:", mats.status);
if (mats.status === 200) {
  console.log("  count:", mats.json.records?.length ?? 0);
  const first = mats.json.records?.[0];
  if (first) {
    console.log("  first id:", first.id);
    console.log("  first fields:", JSON.stringify(first.fields, null, 2));
  }
} else {
  console.log("  error:", JSON.stringify(mats.json, null, 2));
}

console.log("---");

const formula = encodeURIComponent(
  'AND({client_request_id}="00000000-0000-4000-8000-000000000000", IS_AFTER(CREATED_TIME(), DATEADD(TODAY(), -30, "days")))',
);
const idem = await req(`${logTable}?pageSize=1&filterByFormula=${formula}`);
console.log("GET Consumption_logs (idempotency formula):", idem.status);
if (idem.status !== 200) {
  console.log("  error:", JSON.stringify(idem.json, null, 2));
}

console.log("---");

const materialId = mats.json?.records?.[0]?.id;
if (materialId) {
  const testBody = {
    fields: {
      material: [materialId],
      usage_type: "rd_lab",
      quantity: 1,
      occurred_at: new Date().toISOString(),
      client_request_id: "00000000-0000-4000-8000-000000000099",
      voided: false,
    },
  };
  const create = await req(logTable, { method: "POST", body: JSON.stringify(testBody) });
  console.log("POST Consumption_logs (test):", create.status);
  console.log("  response:", JSON.stringify(create.json, null, 2));
  if (create.status === 200 && create.json?.id) {
    const del = await req(`${logTable}/${create.json.id}`, { method: "DELETE" });
    console.log("  cleanup DELETE:", del.status);
  }
} else {
  console.log("Skip POST test — no material record found");
}
