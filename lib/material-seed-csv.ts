import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Minimal CSV parser for UTF-8 seed files (quoted fields, commas). */
export function parseSeedCsv(text: string): Record<string, string>[] {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]?.trim();
      if (!key) continue;
      const val = (cells[c] ?? "").trim();
      row[key] = val;
      if (val) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const SEEDS_DIR = join(process.cwd(), "airtable", "seeds");

export function readSeedCsv(filename: string): Record<string, string>[] {
  try {
    const text = readFileSync(join(SEEDS_DIR, filename), "utf8");
    return parseSeedCsv(text);
  } catch {
    return [];
  }
}

export function readSupplierNames(): string[] {
  return readSeedCsv("suppliers.csv")
    .map((r) => r.name?.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function readPackagingTemplates(category?: string): Record<string, string>[] {
  const rows = readSeedCsv("materials_packaging.csv");
  if (!category) return rows;
  return rows.filter((r) => r.category?.trim() === category);
}
