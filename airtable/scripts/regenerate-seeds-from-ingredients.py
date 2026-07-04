#!/usr/bin/env python3
"""Regenerate Airtable seed CSVs.

- ingredients_2026.csv  → 精油行（Excel EO & Extracts）
- materials_packaging.csv  → 瓶子/标签/丝带/包装等（手工维护，可空）
- 合并输出 materials.csv；suppliers.csv = 两文件 supplier 列并集
"""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / "seeds"
INGREDIENTS = SEEDS / "ingredients_2026.csv"
PACKAGING = SEEDS / "materials_packaging.csv"

MATERIAL_BATCHES_HEADER = [
    "batch_code",
    "material",
    "order_date",
    "qty_ordered",
    "price",
    "shipment_fee",
    "discount",
    "supplier",
    "notes",
]

CONSUMPTION_LOGS_HEADER = [
    "material",
    "usage_type",
    "quantity",
    "occurred_at",
    "operator",
    "device_id",
    "client_request_id",
    "voided",
    "void_reason",
    "note",
]


def read_material_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not path.is_file():
        return [], []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or [])
        rows = [dict(row) for row in reader if any(v.strip() for v in row.values() if v)]
    return fields, rows


def merge_fieldnames(*groups: list[str]) -> list[str]:
    seen: set[str] = set()
    merged: list[str] = []
    for group in groups:
        for name in group:
            if name and name not in seen:
                seen.add(name)
                merged.append(name)
    return merged


def main() -> None:
    if not INGREDIENTS.is_file():
        raise SystemExit(f"Missing source file: {INGREDIENTS}")

    ing_fields, ing_rows = read_material_rows(INGREDIENTS)
    pkg_fields, pkg_rows = read_material_rows(PACKAGING)
    if not ing_fields:
        raise SystemExit(f"No header in {INGREDIENTS}")

    material_fields = merge_fieldnames(ing_fields, pkg_fields)
    material_rows = ing_rows + pkg_rows

    suppliers = sorted(
        {
            r.get("supplier", "").strip()
            for r in material_rows
            if r.get("supplier", "").strip()
        }
    )

    with (SEEDS / "suppliers.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "notes"])
        for name in suppliers:
            w.writerow([name, ""])

    with (SEEDS / "materials.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=material_fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(material_rows)

    with (SEEDS / "material_batches.csv").open("w", encoding="utf-8-sig", newline="") as f:
        csv.writer(f).writerow(MATERIAL_BATCHES_HEADER)

    with (SEEDS / "consumption_logs.csv").open("w", encoding="utf-8-sig", newline="") as f:
        csv.writer(f).writerow(CONSUMPTION_LOGS_HEADER)

    print(f"ingredients: {len(ing_rows)} rows from {INGREDIENTS.name}")
    print(f"packaging:   {len(pkg_rows)} rows from {PACKAGING.name}")
    print(f"materials.csv: {len(material_rows)} rows, {len(material_fields)} cols")
    print(f"suppliers.csv: {len(suppliers)} suppliers")


if __name__ == "__main__":
    main()
