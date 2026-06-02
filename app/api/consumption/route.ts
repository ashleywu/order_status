import { NextResponse } from "next/server";
import {
  ConsumptionApiError,
  mapAirtableError,
  postConsumptionRecord,
  type ConsumptionPostBody,
} from "@/lib/consumption-api";
import {
  requireAirtableConsumptionEnv,
  requireAirtableMaterialsEnv,
} from "@/lib/env";
import { requireAuth } from "@/lib/require-auth-api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  let materialsCfg: ReturnType<typeof requireAirtableMaterialsEnv>;
  let consumptionCfg: ReturnType<typeof requireAirtableConsumptionEnv>;
  try {
    materialsCfg = requireAirtableMaterialsEnv();
    consumptionCfg = requireAirtableConsumptionEnv();
  } catch {
    return NextResponse.json(
      { ok: false, error: "upstream_error" },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_quantity" }, { status: 400 });
  }

  const body = json as Partial<ConsumptionPostBody>;

  try {
    const result = await postConsumptionRecord({
      pat: consumptionCfg.pat,
      baseId: consumptionCfg.baseId,
      materialsTable: materialsCfg.tableId,
      consumptionTable: consumptionCfg.tableId,
      body: {
        materialId: body.materialId ?? "",
        usageType: body.usageType as ConsumptionPostBody["usageType"],
        quantity: body.quantity as number,
        clientRequestId: body.clientRequestId ?? "",
        occurredAt: body.occurredAt,
      },
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ConsumptionApiError) {
      return NextResponse.json({ ok: false, error: e.code }, { status: e.status });
    }
    console.error("[consumption POST]", e);
    const mapped = mapAirtableError(e);
    return NextResponse.json(
      { ok: false, error: mapped.code },
      { status: mapped.status },
    );
  }
}
