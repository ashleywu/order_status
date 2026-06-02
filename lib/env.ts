import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_PASSCODE_HASH: z.string().min(1).optional(),
  /** Dev only: plaintext fallback when APP_PASSCODE_HASH is unset — never rely on this in production. */
  APP_PASSCODE: z.string().optional(),
});

export type ParsedEnv = z.infer<typeof envSchema>;

let cached: (ParsedEnv & { isProduction: boolean }) | null = null;

/**
 * Validates env once per process; throws so misconfiguration fails loudly (per M2 / plan §5).
 */
export function getEnv(): ParsedEnv & { isProduction: boolean } {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }

  const isProduction = parsed.data.NODE_ENV === "production";
  const hasHash = !!parsed.data.APP_PASSCODE_HASH?.trim();
  const hasPlain = !!parsed.data.APP_PASSCODE?.trim();

  if (isProduction && !hasHash) {
    throw new Error("APP_PASSCODE_HASH is required when NODE_ENV=production");
  }

  if (!isProduction && !hasHash && !hasPlain) {
    throw new Error(
      "Set APP_PASSCODE_HASH (recommended) or APP_PASSCODE for local development only.",
    );
  }

  cached = { ...parsed.data, isProduction };
  return cached;
}

/** M3+：拉取 Materials 时必填 — 若不配置则 materials 路由返回 500。 */
export function requireAirtableMaterialsEnv(): {
  pat: string;
  baseId: string;
  tableId: string;
} {
  getEnv();
  const pat = process.env.AIRTABLE_PAT?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const tableId = process.env.AIRTABLE_MATERIALS_TABLE?.trim();
  if (!pat || !baseId || !tableId) {
    throw new Error(
      "Missing AIRTABLE_PAT, AIRTABLE_BASE_ID, or AIRTABLE_MATERIALS_TABLE",
    );
  }
  return { pat, baseId, tableId };
}

/** M5+：写入 Consumption_logs 时必填。 */
export function requireAirtableConsumptionEnv(): {
  pat: string;
  baseId: string;
  tableId: string;
} {
  getEnv();
  const pat = process.env.AIRTABLE_PAT?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const tableId = process.env.AIRTABLE_CONSUMPTION_TABLE?.trim();
  if (!pat || !baseId || !tableId) {
    throw new Error(
      "Missing AIRTABLE_PAT, AIRTABLE_BASE_ID, or AIRTABLE_CONSUMPTION_TABLE",
    );
  }
  return { pat, baseId, tableId };
}

/** M5 §4.4 — default 30 days when unset or invalid. */
export function getIdempotencyLookupDays(): number {
  const raw = process.env.IDEMPOTENCY_LOOKUP_DAYS?.trim();
  if (!raw) return 30;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return 30;
  return n;
}
