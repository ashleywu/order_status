/**
 * Reads .env.local and reports what is still missing (Chinese output).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

function bad(value) {
  if (!value) return true;
  if (value.includes("在这里粘贴")) return true;
  if (value.startsWith("PASTE_")) return true;
  return false;
}

if (!existsSync(envPath)) {
  console.log("❌ 找不到 .env.local");
  console.log("   请复制 .env.example 为 .env.local，或查看 airtable/SETUP.txt");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const missing = [];

if (bad(env.SESSION_SECRET) || (env.SESSION_SECRET?.length ?? 0) < 32) {
  missing.push("SESSION_SECRET（至少 32 字符）");
}
if (bad(env.APP_PASSCODE) && bad(env.APP_PASSCODE_HASH)) {
  missing.push("APP_PASSCODE 或 APP_PASSCODE_HASH（登录密码）");
}
if (bad(env.AIRTABLE_PAT) || !env.AIRTABLE_PAT?.startsWith("pat")) {
  missing.push("AIRTABLE_PAT（以 pat 开头的令牌，见 airtable/SETUP.txt 第 1 步）");
}
if (bad(env.AIRTABLE_BASE_ID) || !env.AIRTABLE_BASE_ID?.startsWith("app")) {
  missing.push("AIRTABLE_BASE_ID（以 app 开头的 Base ID，见 SETUP.txt 第 2 步）");
}
if (bad(env.AIRTABLE_MATERIALS_TABLE)) {
  missing.push("AIRTABLE_MATERIALS_TABLE（默认 Materials）");
}
if (bad(env.AIRTABLE_CONSUMPTION_TABLE)) {
  missing.push("AIRTABLE_CONSUMPTION_TABLE（默认 Consumption_logs）");
}

if (missing.length) {
  console.log("还差这些配置：\n");
  for (const m of missing) console.log("  • " + m);
  console.log("\n打开 .env.local 改好后，再运行：npm run check-env");
  process.exit(1);
}

console.log("✅ 可以启动");
console.log("   npm run dev");
console.log("   浏览器 http://localhost:3000");
if (env.APP_PASSCODE && !bad(env.APP_PASSCODE)) {
  console.log("   登录密码：" + env.APP_PASSCODE);
}
