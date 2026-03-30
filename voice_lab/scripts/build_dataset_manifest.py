#!/usr/bin/env python3
"""Build a normalized JSONL manifest for multi-speaker TTS training.

Input files:
- speakers CSV with speaker metadata.
- transcripts JSONL with fields: utterance_id, speaker_id, text
- audio files under <audio_root>/<speaker_id>/<utterance_id>.wav

Output JSONL rows include:
- audio_path, text, speaker_id, age_band, gender, locale, consent_scope
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, Any


def load_speakers(path: Path) -> Dict[str, Dict[str, str]]:
    speakers: Dict[str, Dict[str, str]] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"speaker_id", "age_band", "gender", "locale", "consent_scope"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"speakers CSV missing columns: {sorted(missing)}")
        for row in reader:
            sid = (row.get("speaker_id") or "").strip()
            if not sid:
                continue
            speakers[sid] = row
    return speakers


def iter_transcripts(path: Path):
    with path.open("r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at line {line_num}: {exc}") from exc
            yield row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", required=True, type=Path)
    parser.add_argument("--transcripts", required=True, type=Path)
    parser.add_argument("--speakers", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    speakers = load_speakers(args.speakers)
    args.out.parent.mkdir(parents=True, exist_ok=True)

    total = 0
    kept = 0
    with args.out.open("w", encoding="utf-8") as out_f:
        for row in iter_transcripts(args.transcripts):
            total += 1
            utterance_id = str(row.get("utterance_id", "")).strip()
            speaker_id = str(row.get("speaker_id", "")).strip()
            text = str(row.get("text", "")).strip()

            if not utterance_id or not speaker_id or not text:
                continue
            if speaker_id not in speakers:
                continue

            audio_path = args.audio_root / speaker_id / f"{utterance_id}.wav"
            if not audio_path.exists():
                continue

            spk = speakers[speaker_id]
            manifest_row: Dict[str, Any] = {
                "audio_path": str(audio_path.as_posix()),
                "text": text,
                "speaker_id": speaker_id,
                "age_band": spk.get("age_band", ""),
                "gender": spk.get("gender", ""),
                "locale": spk.get("locale", ""),
                "consent_scope": spk.get("consent_scope", ""),
            }
            out_f.write(json.dumps(manifest_row, ensure_ascii=True) + "\n")
            kept += 1

    print(f"manifest rows kept: {kept}/{total}")


if __name__ == "__main__":
    main()
