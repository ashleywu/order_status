/**
 * Prints Vercel env var names and copies-ready values from .env.local
 * (run locally only — never commit .env.local).
 *
 * Usage: node scripts/vercel-env-hints.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

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

const local = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};

const sessionSecret =
  local.SESSION_SECRET?.length >= 32
    ? local.SESSION_SECRET
    : randomBytes(32).toString("hex");

const passcode = process.env.DEPLOY_PASSCODE || "1234";
const passcodeHash = bcrypt.hashSync(passcode, 12);

console.log("Paste these in Vercel → Project → Settings → Environment Variables");
console.log("(Production + Preview, or Production only)\n");
console.log("SESSION_SECRET=" + sessionSecret);
console.log("APP_PASSCODE_HASH=" + passcodeHash);
console.log("(plain passcode for login: " + passcode + " — change DEPLOY_PASSCODE before running if needed)\n");

if (local.AIRTABLE_PAT?.startsWith("pat")) {
  console.log("AIRTABLE_PAT=" + local.AIRTABLE_PAT);
} else {
  console.log("AIRTABLE_PAT=<paste from .env.local>");
}
if (local.AIRTABLE_BASE_ID?.startsWith("app")) {
  console.log("AIRTABLE_BASE_ID=" + local.AIRTABLE_BASE_ID);
} else {
  console.log("AIRTABLE_BASE_ID=<paste from .env.local>");
}
console.log("AIRTABLE_MATERIALS_TABLE=" + (local.AIRTABLE_MATERIALS_TABLE || "Materials"));
console.log("AIRTABLE_CONSUMPTION_TABLE=" + (local.AIRTABLE_CONSUMPTION_TABLE || "Consumption_logs"));
console.log("\nDo NOT set APP_PASSCODE in production.");
