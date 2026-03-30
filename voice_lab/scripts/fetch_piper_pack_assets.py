#!/usr/bin/env python3
"""Download Piper model assets referenced by a pack manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.request import urlretrieve


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def fetch(url: str, out_path: Path) -> None:
    ensure_parent(out_path)
    print(f"downloading {url} -> {out_path}")
    urlretrieve(url, out_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--root", required=False, type=Path, default=Path("."))
    args = parser.parse_args()

    if not args.manifest.exists():
      print(f"manifest not found: {args.manifest}", file=sys.stderr)
      sys.exit(1)

    data = json.loads(args.manifest.read_text(encoding="utf-8"))

    model_rel = data.get("model", {}).get("model_path")
    config_rel = data.get("model", {}).get("config_path")
    model_url = data.get("downloads", {}).get("model_url")
    config_url = data.get("downloads", {}).get("config_url")

    if not model_rel or not config_rel or not model_url or not config_url:
      print("manifest missing model paths or download URLs", file=sys.stderr)
      sys.exit(1)

    fetch(model_url, args.root / model_rel)
    fetch(config_url, args.root / config_rel)

    print("download complete")


if __name__ == "__main__":
    main()
