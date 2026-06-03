/**
 * Push env vars from .env.local to linked Vercel project (production).
 * Usage: node scripts/push-vercel-env.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import bcrypt from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function addEnv(name, value, target = "production") {
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", name, target, "--force"],
    {
      input: value,
      encoding: "utf8",
      cwd: root,
      shell: true,
    },
  );
  if (r.status !== 0) {
    console.error(`Failed ${name}:`, r.stderr || r.stdout);
    return false;
  }
  console.log("Set", name);
  return true;
}

if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const local = parseEnv(readFileSync(envPath, "utf8"));
const passcode = process.env.DEPLOY_PASSCODE || local.APP_PASSCODE || "1234";
const passcodeHash =
  local.APP_PASSCODE_HASH?.startsWith("$2")
    ? local.APP_PASSCODE_HASH
    : bcrypt.hashSync(passcode, 12);

const vars = {
  SESSION_SECRET: local.SESSION_SECRET,
  APP_PASSCODE_HASH: passcodeHash,
  AIRTABLE_PAT: local.AIRTABLE_PAT,
  AIRTABLE_BASE_ID: local.AIRTABLE_BASE_ID,
  AIRTABLE_MATERIALS_TABLE: local.AIRTABLE_MATERIALS_TABLE || "Materials",
  AIRTABLE_CONSUMPTION_TABLE:
    local.AIRTABLE_CONSUMPTION_TABLE || "Consumption_logs",
};

let ok = true;
for (const [name, value] of Object.entries(vars)) {
  if (!value?.trim()) {
    console.error("Missing value for", name);
    ok = false;
    continue;
  }
  if (!addEnv(name, value.trim())) ok = false;
}

process.exit(ok ? 0 : 1);
