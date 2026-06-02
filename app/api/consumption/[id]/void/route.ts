import {
  ConsumptionApiError,
  mapAirtableError,
  voidConsumptionRecord,
} from "@/lib/consumption-api";
import { requireAirtableConsumptionEnv } from "@/lib/env";
import { requireAuth } from "@/lib/require-auth-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const denied = await requireAuth();
  if (denied) return denied;

  let consumptionCfg: ReturnType<typeof requireAirtableConsumptionEnv>;
  try {
    consumptionCfg = requireAirtableConsumptionEnv();
  } catch {
    return NextResponse.json(
      { ok: false, error: "upstream_error" },
      { status: 500 },
    );
  }

  const { id: recordId } = await context.params;

  let reason: string | undefined;
  try {
    const json = (await req.json()) as { reason?: string };
    reason = json.reason;
  } catch {
    reason = undefined;
  }

  try {
    const result = await voidConsumptionRecord({
      pat: consumptionCfg.pat,
      baseId: consumptionCfg.baseId,
      consumptionTable: consumptionCfg.tableId,
      recordId,
      reason,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ConsumptionApiError) {
      return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
    }
    console.error("[consumption void]", e);
    const mapped = mapAirtableError(e);
    return NextResponse.json(
      { ok: false, error: mapped.code },
      { status: mapped.status },
    );
  }
}
