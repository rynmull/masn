# Masn – Modern AAC Communication Platform

**Masn** is an AI-assisted Augmentative and Alternative Communication (AAC) app designed for nonverbal and minimally verbal users. It goes beyond traditional picture boards by combining adaptive learning, expressive TTS, and offline-first reliability.

## Features (Planned)
- Offline AAC boards with symbol and word-based communication
- High-contrast, large-hit-area UI for accessibility
- On-device text-to-speech with multiple voice options
- Adaptive word prediction that learns the user's patterns
- Emotional tone selection for more natural speech
- Caregiver mode for customization and sync
- End-to-end encrypted cloud sync (optional)

## Tech Stack
- **Frontend**: React Native + Expo (TypeScript)
- **Storage**: SQLite (offline-first)
- **Voice**: Expo Speech (on-device TTS) + optional ElevenLabs cloud TTS
- **Sync**: Encrypted optional cloud (future)
- **ML**: Local word prediction (future)

## AAC Symbols
- The app uses ARASAAC-style symbol terms for AAC pictograms.
- ARASAAC resources are provided by CATEDU and require proper attribution when distributed in production builds.

## Getting Started
1. Install dependencies: `npm install`
2. Start Expo: `npm start`
3. Scan QR with Expo Go on your device

## Optional: ElevenLabs Voice Setup
1. Set `EXPO_PUBLIC_ELEVENLABS_API_KEY` in your environment.
2. Optionally set `EXPO_PUBLIC_ELEVENLABS_VOICE_ID` for a default voice.
3. In caregiver mode, set Voice Engine to `ElevenLabs` and optionally override Voice ID.

Notes:
- Some system/browser TTS engines ignore pitch/rate controls even when passed correctly.
- When ElevenLabs is selected but unavailable (missing key/network error), the app falls back to native TTS.

## Optional: Local Piper Web Bridge (Advanced)
1. Start bridge server: `python3 voice_lab/scripts/piper_web_bridge_server.py --port 8765 --root /workspaces/masn`
2. Set `EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL` if not using the default.
3. If running from hosted `github.dev` URLs, set `EXPO_PUBLIC_ENABLE_PIPER_WEB_BRIDGE=true` to force-enable bridge attempts.

Notes:
- On hosted web environments (`*.github.dev`), local engine defaults to native speech fallback to avoid tunnel/CORS instability.
- Native iOS/Android local runtime path remains unchanged.

## Optional: Proprietary Voice Setup
1. Set `EXPO_PUBLIC_PROPRIETARY_TTS_URL` (base URL for your TTS service).
2. Optionally set `EXPO_PUBLIC_PROPRIETARY_TTS_API_KEY`.
3. Optionally set `EXPO_PUBLIC_PROPRIETARY_TTS_VOICE_ID`.
4. In caregiver mode, set Voice Engine to `Proprietary`.

Expected endpoint contract:
- `POST {EXPO_PUBLIC_PROPRIETARY_TTS_URL}/synthesize`
- Request JSON:
	- `text` (string)
	- `emotion` (`neutral|happy|sad|angry|calm`)
	- `pitch` (number)
	- `rate` (number)
	- `voiceId` (string)
	- `format` (`mp3`)
- Response: `audio/mpeg` binary stream.

Notes:
- If proprietary synthesis fails or is unavailable, the app falls back to native TTS.

## Voice Lab (Build Your Own AI Voices)
- Use [voice_lab/README.md](voice_lab/README.md) to start consented voice collection and dataset prep.
- Includes:
	- speaker metadata schema
	- consent template
	- manifest builder script
	- representation coverage report script

Goal: create first-party voice packs for eventual fully offline TTS deployment.

## Project Status
Early prototype – basic AAC board functional (categories, buttons, speech). Word prediction and caregiver mode in progress.

## License
Proprietary – All rights reserved.
