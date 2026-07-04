#!/usr/bin/env python3
"""Insert material_group column into seed CSVs (after category)."""

from __future__ import annotations

import csv
from pathlib import Path

SEEDS = Path(__file__).resolve().parents[1] / "seeds"
FILES = ["ingredients_2026.csv", "materials.csv", "materials_packaging.csv"]
DEFAULT_GROUP = "精油"


def add_column(path: Path) -> None:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return
        if "material_group" in reader.fieldnames:
            return
        fields = list(reader.fieldnames)
        cat_idx = fields.index("category")
        fields.insert(cat_idx + 1, "material_group")
        rows = list(reader)

    for row in rows:
        if any(v.strip() for v in row.values() if v):
            row["material_group"] = DEFAULT_GROUP if row.get("category") == "ingredient" else ""

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    print(path.name, "-> material_group added,", len(rows), "rows")


def main() -> None:
    for name in FILES:
        p = SEEDS / name
        if p.is_file():
            add_column(p)


if __name__ == "__main__":
    main()
