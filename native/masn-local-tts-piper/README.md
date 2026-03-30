# MASN Local TTS Piper Native Module (Scaffold)

This folder contains starter native bridge files for `MasnLocalTtsPiper`.

## What Is Included
- Android bridge module + package under `android/src/main/java/com/masn/tts/piper/`
- iOS Swift + ObjC bridge export under `ios/`

The module contract matches the JS payload used by `src/utils/localTtsBridge.ts`.

## Current Status
- Payload parsing and validation are implemented.
- Synthesis currently returns `E_PIPER_NOT_IMPLEMENTED` until Piper runtime wiring is completed.

## Expected Payload Fields
- `text`
- `emotion`
- `runtime` (`piper`)
- `voicePackId`
- `voicePackManifestUri`
- `pitch`
- `rate`
- `piperConfig` object:
  - `lengthScale`
  - `noiseScale`
  - `noiseW`
  - `sentenceSilenceSeconds`
  - `pitchShiftSemitones`
  - `styleIntensity`

## Integration Notes
1. Prebuild the Expo app (`npx expo prebuild`) to create native project folders.
2. Copy module sources into platform-native project structure or package as a local RN module.
3. Register Android package (`MasnLocalTtsPiperPackage`) in your app host.
4. Ensure iOS target includes `MasnLocalTtsPiper.swift` and `MasnLocalTtsPiper.m`.
5. Wire Piper engine init and synthesis inside `synthesize(...)`.

## Naming
This module exposes `MasnLocalTtsPiper`, which is auto-detected by `src/utils/piperNativeModule.ts`.
