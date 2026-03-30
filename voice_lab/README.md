# Voice Lab (Offline AI Voice Pipeline)

This workspace bootstraps first-party AI-generated voices for MASN using **consented** speaker data and an offline-first deployment target.

## Scope
- Collect consented recordings with metadata.
- Build a normalized training manifest.
- Validate representation coverage across age/gender/locale.
- Prepare data for multi-speaker TTS training.

## Directory Layout
- `voice_lab/consent/` legal and participant docs.
- `voice_lab/dataset/` schemas and generated manifests.
- `voice_lab/scripts/` data prep and QA utilities.
- `voice_lab/examples/` starter metadata templates.

## Data Requirements
- WAV mono audio, 24kHz recommended.
- Clear transcript per utterance.
- Speaker metadata must include:
  - `speaker_id`
  - `age_band` (`child|teen|adult|older_adult`)
   - `gender` (`male|female`)
  - `locale`
  - `consent_scope`

## Recommended Collection Targets
- 20-40 speakers minimum for a baseline multi-speaker model.
- 30-120 minutes per speaker.
- Balanced representation across age bands and gender identities.
- Multiple locales/accents for robustness.

## Quick Start
1. Copy `voice_lab/examples/speakers_template.csv` to your private dataset folder and fill metadata.
2. Place recordings in this structure:
   - `data/raw/<speaker_id>/<utterance_id>.wav`
3. Create transcript JSONL:
   - `data/raw/transcripts.jsonl`
4. Build manifest:
   - `python3 voice_lab/scripts/build_dataset_manifest.py --audio-root data/raw --transcripts data/raw/transcripts.jsonl --speakers data/raw/speakers.csv --out voice_lab/dataset/train_manifest.jsonl`
5. Validate representation:
   - `python3 voice_lab/scripts/analyze_coverage.py --speakers data/raw/speakers.csv`

## Starter Piper Packs (Offline Runtime)
The app starter local packs reference these manifests:
- `voice_lab/packs/adult_female_en_us_a1/manifest.json`
- `voice_lab/packs/adult_male_en_us_b1/manifest.json`
- `voice_lab/packs/older_female_en_us_c1/manifest.json`
- `voice_lab/packs/older_male_en_us_d1/manifest.json`

To fetch model assets for a pack:
- `python3 voice_lab/scripts/fetch_piper_pack_assets.py --manifest voice_lab/packs/adult_female_en_us_a1/manifest.json --root .`

Repeat for each pack manifest. This downloads `model.onnx` and `model.onnx.json` to each pack's `assets/` folder.

## Native Piper Bridge Scaffold
Native bridge starter files are in:
- `native/masn-local-tts-piper/android/`
- `native/masn-local-tts-piper/ios/`

These files expose `MasnLocalTtsPiper` and match the payload contract in `src/utils/localTtsBridge.ts`.
The runtime is scaffolded and must be wired to a Piper inference library in your native host project.

## Test Piper In Web App Right Now
You can test local Piper voices in the browser by running a small local bridge server.

1. Ensure Piper CLI is installed and available as `piper` on your PATH.
2. Download at least one starter pack model and config:
   - `python3 voice_lab/scripts/fetch_piper_pack_assets.py --manifest voice_lab/packs/adult_female_en_us_a1/manifest.json --root .`
3. Start the local bridge server:
   - `python3 voice_lab/scripts/piper_web_bridge_server.py --host 127.0.0.1 --port 8765 --root .`
4. In another terminal, launch Expo web with bridge URL env var:
   - `EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL=http://127.0.0.1:8765 npm run web`
5. In caregiver settings, choose `Local (Offline AI)` engine and pick the matching local pack.
6. Use emotion preview or communicator speak actions to synthesize via Piper.

Troubleshooting:
- If you get `missing_voicePackManifestUri`, ensure the selected pack has `manifest_uri` set.
- If you get `model not found`, run the fetch script for that pack manifest.
- If audio fails on web, verify `GET /health` on the bridge URL returns `{ "ok": true }`.

## Notes
- Do not train from voices without explicit permission.
- Do not use race as a synthetic control knob; use diverse consented speakers and evaluate fairness across groups.
- This repo intentionally keeps training framework-agnostic so you can plug in Coqui/F5-TTS/Piper-compatible pipelines.
