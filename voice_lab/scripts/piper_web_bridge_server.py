#!/usr/bin/env python3
"""Minimal Piper HTTP bridge for local MASN web testing.

Endpoints:
- GET /health
- GET /info
- POST /synthesize  (JSON LocalSynthesisPayload) -> audio/wav bytes
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def clamp(value: float, minimum: float, maximum: float) -> float:
  return max(minimum, min(maximum, value))


def load_manifest(root: Path, manifest_uri: str) -> dict:
  manifest_path = (root / manifest_uri).resolve()
  if not manifest_path.exists():
    raise FileNotFoundError(f"manifest not found: {manifest_path}")
  return json.loads(manifest_path.read_text(encoding="utf-8"))


def run_piper(
  text: str,
  model_path: Path,
  config_path: Path,
  length_scale: float,
  noise_scale: float,
  noise_w_scale: float,
  sentence_silence: float,
) -> bytes:
  if shutil.which("piper") is None:
    raise RuntimeError("piper binary not found on PATH")

  if not model_path.exists():
    raise FileNotFoundError(f"model not found: {model_path}")
  if not config_path.exists():
    raise FileNotFoundError(f"config not found: {config_path}")

  with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
    wav_path = Path(tmp.name)

  try:
    command = [
      "piper",
      "--model",
      str(model_path),
      "--config",
      str(config_path),
      "--output_file",
      str(wav_path),
      "--length_scale",
      str(length_scale),
      "--noise_scale",
      str(noise_scale),
      "--noise_w_scale",
      str(noise_w_scale),
      "--sentence_silence",
      str(sentence_silence),
    ]

    process = subprocess.run(
      command,
      input=text.encode("utf-8"),
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      check=False,
    )

    if process.returncode != 0:
      raise RuntimeError(process.stderr.decode("utf-8", errors="ignore")[:500])

    return wav_path.read_bytes()
  finally:
    try:
      wav_path.unlink(missing_ok=True)
    except Exception:
      pass


class Handler(BaseHTTPRequestHandler):
  root = Path(".")

  def _send_json(self, status: int, body: dict) -> None:
    data = json.dumps(body).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(data)))
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.end_headers()
    self.wfile.write(data)

  def _send_bytes(self, status: int, mime_type: str, data: bytes) -> None:
    self.send_response(status)
    self.send_header("Content-Type", mime_type)
    self.send_header("Content-Length", str(len(data)))
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.end_headers()
    self.wfile.write(data)

  def do_OPTIONS(self) -> None:
    self.send_response(204)
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    self.end_headers()

  def do_GET(self) -> None:
    if self.path == "/health":
      self._send_json(200, {"ok": True})
      return
    if self.path == "/info":
      self._send_json(200, {"provider": "piper-web-bridge", "version": "0.1.0"})
      return
    self._send_json(404, {"error": "not_found"})

  def do_POST(self) -> None:
    if self.path != "/synthesize":
      self._send_json(404, {"error": "not_found"})
      return

    try:
      content_length = int(self.headers.get("Content-Length", "0"))
      raw = self.rfile.read(content_length)
      payload = json.loads(raw.decode("utf-8"))

      text = str(payload.get("text", "")).strip()
      manifest_uri = str(payload.get("voicePackManifestUri", "")).strip()

      if not text:
        self._send_json(400, {"error": "missing_text"})
        return
      if not manifest_uri:
        self._send_json(400, {"error": "missing_voicePackManifestUri"})
        return

      manifest = load_manifest(self.root, manifest_uri)
      model_rel = manifest.get("model", {}).get("model_path", "")
      config_rel = manifest.get("model", {}).get("config_path", "")
      manifest_defaults = manifest.get("defaults", {})
      payload_config = payload.get("piperConfig", {})

      model_path = (self.root / str(model_rel)).resolve()
      config_path = (self.root / str(config_rel)).resolve()

      length_scale = clamp(
        float(payload_config.get("lengthScale", manifest_defaults.get("lengthScale", 1.0))),
        0.5,
        2.0,
      )
      noise_scale = clamp(
        float(payload_config.get("noiseScale", manifest_defaults.get("noiseScale", 0.667))),
        0.1,
        2.0,
      )
      noise_w_scale = clamp(
        float(payload_config.get("noiseW", manifest_defaults.get("noiseW", 0.8))),
        0.1,
        2.0,
      )
      sentence_silence = clamp(
        float(payload_config.get("sentenceSilenceSeconds", manifest_defaults.get("sentenceSilenceSeconds", 0.12))),
        0.0,
        0.6,
      )

      audio_bytes = run_piper(
        text,
        model_path,
        config_path,
        length_scale=length_scale,
        noise_scale=noise_scale,
        noise_w_scale=noise_w_scale,
        sentence_silence=sentence_silence,
      )
      self._send_bytes(200, "audio/wav", audio_bytes)
    except Exception as exc:
      self._send_json(500, {"error": "synthesis_failed", "message": str(exc)[:500]})


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", default=8765, type=int)
  parser.add_argument("--root", default=".", type=Path)
  args = parser.parse_args()

  Handler.root = args.root.resolve()
  server = ThreadingHTTPServer((args.host, args.port), Handler)
  print(f"piper web bridge listening on http://{args.host}:{args.port} root={Handler.root}")
  server.serve_forever()


if __name__ == "__main__":
  main()
