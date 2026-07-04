/**
 * Resolve Airtable field API names (case-insensitive + CSV BOM prefix fallback).
 * Cached per process for ~10 minutes.
 */

type FieldCache = {
  expiresAt: number;
  names: string[];
  fields: AirtableFieldMeta[];
};

export type AirtableFieldMeta = {
  name: string;
  type: string;
};

const cache = new Map<string, FieldCache>();
const TTL_MS = 10 * 60 * 1000;
const BOM = "\ufeff";

function stripBom(name: string): string {
  return name.startsWith(BOM) ? name.slice(1) : name;
}

/** Match exact API name, case-insensitive, or UTF-8 BOM-prefixed CSV import names. */
export function resolveFieldNameFromList(
  names: string[],
  preferred: string,
): string {
  if (names.includes(preferred)) return preferred;

  const insens = names.find(
    (n) => n.toLowerCase() === preferred.toLowerCase(),
  );
  if (insens) return insens;

  const bomPreferred = BOM + preferred;
  if (names.includes(bomPreferred)) return bomPreferred;

  const bomMatch = names.find(
    (n) => stripBom(n).toLowerCase() === preferred.toLowerCase(),
  );
  if (bomMatch) return bomMatch;

  return preferred;
}

async function probeTableFieldNames(
  pat: string,
  baseId: string,
  tableNameOrId: string,
): Promise<string[]> {
  const tableSeg = encodeURIComponent(tableNameOrId);
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableSeg}?pageSize=1`,
    {
      headers: { Authorization: `Bearer ${pat}` },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as {
    records?: { fields?: Record<string, unknown> }[];
  };
  const first = body.records?.[0]?.fields;
  return first ? Object.keys(first) : [];
}

function findTableMeta(
  tables: { id: string; name: string; fields: AirtableFieldMeta[] }[],
  tableNameOrId: string,
) {
  return (
    tables.find((t) => t.name === tableNameOrId || t.id === tableNameOrId) ??
    tables.find(
      (t) => t.name.toLowerCase() === tableNameOrId.toLowerCase(),
    )
  );
}

async function loadTableFields(
  pat: string,
  baseId: string,
  tableNameOrId: string,
): Promise<AirtableFieldMeta[]> {
  const cacheKey = `${baseId}:${tableNameOrId}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.fields;

  let fields: AirtableFieldMeta[] = [];

  const metaRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    {
      headers: { Authorization: `Bearer ${pat}` },
      cache: "no-store",
    },
  );
  if (metaRes.ok) {
    const body = (await metaRes.json()) as {
      tables: { id: string; name: string; fields: AirtableFieldMeta[] }[];
    };
    const table = findTableMeta(body.tables, tableNameOrId);
    fields = table?.fields ?? [];
  }

  if (fields.length === 0) {
    const probed = await probeTableFieldNames(pat, baseId, tableNameOrId);
    fields = probed.map((name) => ({ name, type: "unknown" }));
  }

  cache.set(cacheKey, {
    fields,
    names: fields.map((f) => f.name),
    expiresAt: Date.now() + TTL_MS,
  });
  return fields;
}

async function loadTableFieldNames(
  pat: string,
  baseId: string,
  tableNameOrId: string,
): Promise<string[]> {
  const fields = await loadTableFields(pat, baseId, tableNameOrId);
  return fields.map((f) => f.name);
}

export async function resolveTableFieldName(
  pat: string,
  baseId: string,
  tableNameOrId: string,
  preferred: string,
): Promise<string> {
  const names = await loadTableFieldNames(pat, baseId, tableNameOrId);
  return resolveFieldNameFromList(names, preferred);
}

export async function resolveTableFieldType(
  pat: string,
  baseId: string,
  tableNameOrId: string,
  preferred: string,
): Promise<string | undefined> {
  const fields = await loadTableFields(pat, baseId, tableNameOrId);
  const key = resolveFieldNameFromList(
    fields.map((f) => f.name),
    preferred,
  );
  return fields.find((f) => f.name === key)?.type;
}

/** Format ISO timestamp for Airtable date vs dateTime columns. */
export function formatOccurredAtForAirtable(
  iso: string,
  fieldType: string | undefined,
): string {
  if (fieldType === "date") {
    return iso.slice(0, 10);
  }
  return iso;
}

export async function resolveConsumptionWriteKeys(
  pat: string,
  baseId: string,
  consumptionTable: string,
): Promise<Record<string, string>> {
  const preferred = [
    "material",
    "usage_type",
    "quantity",
    "occurred_at",
    "client_request_id",
    "voided",
    "void_reason",
  ] as const;
  const out: Record<string, string> = {};
  for (const key of preferred) {
    out[key] = await resolveTableFieldName(pat, baseId, consumptionTable, key);
  }
  return out;
}

/** @deprecated Use resolveTableFieldName */
export async function resolveMaterialFieldName(
  pat: string,
  baseId: string,
  materialsTable: string,
  preferred: string,
): Promise<string> {
  return resolveTableFieldName(pat, baseId, materialsTable, preferred);
}
