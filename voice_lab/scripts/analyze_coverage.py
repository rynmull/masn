#!/usr/bin/env python3
"""Simple representation coverage report for speaker metadata CSV."""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--speakers", required=True, type=Path)
    args = parser.parse_args()

    age_counter: Counter[str] = Counter()
    gender_counter: Counter[str] = Counter()
    locale_counter: Counter[str] = Counter()

    with args.speakers.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        age_counter[(row.get("age_band") or "unknown").strip() or "unknown"] += 1
        gender_counter[(row.get("gender") or "unknown").strip() or "unknown"] += 1
        locale_counter[(row.get("locale") or "unknown").strip() or "unknown"] += 1

    print(f"total speakers: {len(rows)}")
    print("\nage_band distribution:")
    for key, val in sorted(age_counter.items()):
        print(f"- {key}: {val}")

    print("\ngender distribution:")
    for key, val in sorted(gender_counter.items()):
        print(f"- {key}: {val}")

    print("\nlocale distribution:")
    for key, val in sorted(locale_counter.items()):
        print(f"- {key}: {val}")


if __name__ == "__main__":
    main()
