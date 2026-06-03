/**
 * Resolve Airtable field API names (case-insensitive fallback).
 * Cached per process for ~10 minutes.
 */

type FieldCache = {
  expiresAt: number;
  names: string[];
};

const cache = new Map<string, FieldCache>();
const TTL_MS = 10 * 60 * 1000;

async function loadTableFieldNames(
  pat: string,
  baseId: string,
  tableNameOrId: string,
): Promise<string[]> {
  const cacheKey = `${baseId}:${tableNameOrId}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.names;

  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    {
      headers: { Authorization: `Bearer ${pat}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to load Airtable table meta (${res.status})`);
  }

  const body = (await res.json()) as {
    tables: { id: string; name: string; fields: { name: string }[] }[];
  };

  const table = body.tables.find(
    (t) => t.name === tableNameOrId || t.id === tableNameOrId,
  );
  const names = table?.fields.map((f) => f.name) ?? [];

  cache.set(cacheKey, { names, expiresAt: Date.now() + TTL_MS });
  return names;
}

/** Match exact API name, else case-insensitive; falls back to preferred. */
export async function resolveMaterialFieldName(
  pat: string,
  baseId: string,
  materialsTable: string,
  preferred: string,
): Promise<string> {
  const names = await loadTableFieldNames(pat, baseId, materialsTable);
  if (names.includes(preferred)) return preferred;
  const insens = names.find((n) => n.toLowerCase() === preferred.toLowerCase());
  return insens ?? preferred;
}
