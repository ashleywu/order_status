import { AirtableHttpError } from "@/lib/airtable";
import { listConsumptionLogs, parseConsumptionLogsQuery } from "@/lib/consumption-logs-api";
import type { ConsumptionLogsPayload } from "@/lib/consumption-logs-contract";
import {
  requireAirtableConsumptionEnv,
  requireAirtableMaterialsEnv,
} from "@/lib/env";
import { requireAuth } from "@/lib/require-auth-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  let materialsCfg: ReturnType<typeof requireAirtableMaterialsEnv>;
  let consumptionCfg: ReturnType<typeof requireAirtableConsumptionEnv>;
  try {
    materialsCfg = requireAirtableMaterialsEnv();
    consumptionCfg = requireAirtableConsumptionEnv();
  } catch {
    return NextResponse.json(
      { error: "Consumption logs service is not configured" },
      { status: 500 },
    );
  }

  const query = parseConsumptionLogsQuery(new URL(req.url).searchParams);

  try {
    const logs = await listConsumptionLogs({
      pat: consumptionCfg.pat,
      baseId: consumptionCfg.baseId,
      consumptionTable: consumptionCfg.tableId,
      materialsTable: materialsCfg.tableId,
      query,
    });

    const body: ConsumptionLogsPayload = {
      logs,
      period: query.period ?? "today",
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error("[consumption logs GET]", e);
    if (e instanceof AirtableHttpError) {
      return NextResponse.json(
        { error: "Failed to load consumption logs from Airtable" },
        { status: e.status === 429 ? 429 : 502 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load consumption logs" },
      { status: 502 },
    );
  }
}
