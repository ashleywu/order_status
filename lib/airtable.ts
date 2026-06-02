/** Airtable REST client: import only from app/api Route Handlers (server). */

import { escapeAirtableFormulaString } from "./airtable-formula";

const AIRTABLE_HOST = "https://api.airtable.com/v0";

export type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
};

type AirtableListResponse = {
  records: AirtableRecord[];
  offset?: string;
};

export class AirtableHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AirtableHttpError";
  }
}

async function airtableFetch(
  pat: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

/** Paginate with offset cursor until exhausted. */
export async function fetchAllRecords(
  pat: string,
  baseId: string,
  tableIdOrName: string,
  filterByFormula: string,
): Promise<AirtableRecord[]> {
  const tableSeg = encodeURIComponent(tableIdOrName);
  const all: AirtableRecord[] = [];
  let nextOffset: string | undefined;

  do {
    const qs = new URLSearchParams({
      filterByFormula,
      pageSize: "100",
    });
    if (nextOffset) qs.set("offset", nextOffset);

    const url = `${AIRTABLE_HOST}/${baseId}/${tableSeg}?${qs.toString()}`;
    const res = await airtableFetch(pat, url);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AirtableHttpError(res.status, text.slice(0, 300));
    }

    const body = (await res.json()) as AirtableListResponse;
    all.push(...body.records);
    nextOffset = body.offset;
  } while (nextOffset);

  return all;
}

export async function getRecord(
  pat: string,
  baseId: string,
  tableIdOrName: string,
  recordId: string,
): Promise<AirtableRecord | null> {
  const tableSeg = encodeURIComponent(tableIdOrName);
  const recSeg = encodeURIComponent(recordId);
  const url = `${AIRTABLE_HOST}/${baseId}/${tableSeg}/${recSeg}`;
  const res = await airtableFetch(pat, url);

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AirtableHttpError(res.status, text.slice(0, 300));
  }

  return (await res.json()) as AirtableRecord;
}

export async function createRecord(
  pat: string,
  baseId: string,
  tableIdOrName: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const tableSeg = encodeURIComponent(tableIdOrName);
  const url = `${AIRTABLE_HOST}/${baseId}/${tableSeg}`;
  const res = await airtableFetch(pat, url, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AirtableHttpError(res.status, text.slice(0, 300));
  }

  return (await res.json()) as AirtableRecord;
}

export async function patchRecord(
  pat: string,
  baseId: string,
  tableIdOrName: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const tableSeg = encodeURIComponent(tableIdOrName);
  const recSeg = encodeURIComponent(recordId);
  const url = `${AIRTABLE_HOST}/${baseId}/${tableSeg}/${recSeg}`;
  const res = await airtableFetch(pat, url, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });

  if (res.status === 404) {
    throw new AirtableHttpError(404, "not_found");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AirtableHttpError(res.status, text.slice(0, 300));
  }

  return (await res.json()) as AirtableRecord;
}

export function consumptionIdempotencyFormula(
  clientRequestId: string,
  lookupDays: number,
): string {
  const escaped = escapeAirtableFormulaString(clientRequestId);
  const days = Math.max(1, Math.floor(lookupDays));
  return `AND({client_request_id}="${escaped}", IS_AFTER(CREATED_TIME(), DATEADD(TODAY(), -${days}, "days")))`;
}

/** Find consumption rows by client_request_id within CREATED_TIME window; earliest first. */
export async function findConsumptionByClientRequestId(
  pat: string,
  baseId: string,
  consumptionTable: string,
  clientRequestId: string,
  lookupDays: number,
): Promise<AirtableRecord[]> {
  const formula = consumptionIdempotencyFormula(clientRequestId, lookupDays);
  const records = await fetchAllRecords(pat, baseId, consumptionTable, formula);
  return records.sort((a, b) => {
    const ta = a.createdTime ? Date.parse(a.createdTime) : 0;
    const tb = b.createdTime ? Date.parse(b.createdTime) : 0;
    return ta - tb;
  });
}

export function isRecordVoided(record: AirtableRecord): boolean {
  return record.fields.voided === true;
}
