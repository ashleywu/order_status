import { fetchAllRecords } from "@/lib/airtable";
import {
  createMaterialRecord,
  mapMaterialCreateError,
  parseMaterialCreateBody,
} from "@/lib/material-create-api";
import { requireAirtableMaterialsEnv } from "@/lib/env";
import {
  compareMaterialsStable,
  mapRecordToMaterialDto,
} from "@/lib/materials-map";
import {
  MATERIALS_SCHEMA_VERSION,
  type MaterialsPayload,
} from "@/lib/materials-contract";
import { requireAuth } from "@/lib/require-auth-api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  let airtableCfg: ReturnType<typeof requireAirtableMaterialsEnv>;
  try {
    airtableCfg = requireAirtableMaterialsEnv();
  } catch {
    return NextResponse.json(
      { error: "Materials service is not configured" },
      { status: 500 },
    );
  }

  const { pat, baseId, tableId } = airtableCfg;

  try {
    const records = await fetchAllRecords(
      pat,
      baseId,
      tableId,
      "{active}=TRUE()",
    );
    const materials = records
      .map(mapRecordToMaterialDto)
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort(compareMaterialsStable);

    const body: MaterialsPayload = {
      materials,
      generatedAt: new Date().toISOString(),
      schemaVersion: MATERIALS_SCHEMA_VERSION,
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error("[materials GET]", e);
    return NextResponse.json(
      { error: "Failed to load materials from Airtable" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  let airtableCfg: ReturnType<typeof requireAirtableMaterialsEnv>;
  try {
    airtableCfg = requireAirtableMaterialsEnv();
  } catch {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const body = parseMaterialCreateBody(json);
    const material = await createMaterialRecord({
      pat: airtableCfg.pat,
      baseId: airtableCfg.baseId,
      materialsTable: airtableCfg.tableId,
      body,
    });
    return NextResponse.json({ ok: true, material }, { status: 201 });
  } catch (e) {
    console.error("[materials POST]", e);
    const mapped = mapMaterialCreateError(e);
    return NextResponse.json(
      { ok: false, error: mapped.code },
      { status: mapped.status },
    );
  }
}
