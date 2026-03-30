import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getEmotionSettings, type EmotionPreset } from './ttsPresets';
import { getProviderFallbackOrder, normalizeSpeechText, type TtsEngine } from './ttsEngine';
import { ensureLocalTtsBridgeInstalled, getLocalTtsBridge } from './localTtsBridge';
import { registerPiperNativeModuleIfAvailable } from './piperNativeModule';
import { registerPiperWebBridgeFromEnv } from './piperWebBridge';
import { derivePiperSynthesisConfig } from './piperTuning';
import { isForceLocalOnlyMode } from './runtimeFlags';
import { getFirstSql, runSql } from '../lib/db';

export type { TtsEngine } from './ttsEngine';

export interface RuntimeTtsSettings {
  pitch: number;
  rate: number;
  engine: TtsEngine;
  elevenLabsVoiceId?: string;
  localVoicePackId?: string;
  adaptiveStyleEnabled?: boolean;
  offlineOnlyMode?: boolean;
  expressiveVoiceEnabled?: boolean;
  styleLearningEnabled?: boolean;
  styleLearningRate?: number;
  emotionIntensity?: number;
  emotionIntensityByPreset?: Partial<Record<EmotionPreset, number>>;
}

const DEFAULT_ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

type LocalSystemVoice = {
  identifier?: string;
  language?: string;
  quality?: string;
  name?: string;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

let cachedPreferredLocalVoiceId: string | null | undefined;

const resolvePreferredLocalVoiceId = async (): Promise<string | null> => {
  if (cachedPreferredLocalVoiceId !== undefined) {
    return cachedPreferredLocalVoiceId;
  }

  try {
    const voices = (await Speech.getAvailableVoicesAsync()) as LocalSystemVoice[];
    if (!voices.length) {
      cachedPreferredLocalVoiceId = null;
      return null;
    }

    const englishVoices = voices.filter(voice => {
      const language = (voice.language ?? '').toLowerCase();
      return language.startsWith('en');
    });

    const candidates = englishVoices.length > 0 ? englishVoices : voices;
    const sorted = [...candidates].sort((a, b) => {
      const qualityA = (a.quality ?? '').toLowerCase();
      const qualityB = (b.quality ?? '').toLowerCase();
      const enhancedScoreA = qualityA.includes('enhanced') ? 1 : 0;
      const enhancedScoreB = qualityB.includes('enhanced') ? 1 : 0;
      if (enhancedScoreA !== enhancedScoreB) {
        return enhancedScoreB - enhancedScoreA;
      }

      const nameA = (a.name ?? '').toLowerCase();
      const nameB = (b.name ?? '').toLowerCase();
      const naturalScoreA = nameA.includes('neural') || nameA.includes('premium') ? 1 : 0;
      const naturalScoreB = nameB.includes('neural') || nameB.includes('premium') ? 1 : 0;
      if (naturalScoreA !== naturalScoreB) {
        return naturalScoreB - naturalScoreA;
      }

      return 0;
    });

    cachedPreferredLocalVoiceId = sorted[0]?.identifier ?? null;
    return cachedPreferredLocalVoiceId;
  } catch {
    cachedPreferredLocalVoiceId = null;
    return null;
  }
};

const buildRuntimeEmotionSettings = (settings: RuntimeTtsSettings, emotion: EmotionPreset) => {
  const neutral = getEmotionSettings('neutral');
  const emotionPreset = getEmotionSettings(emotion);
  const expressiveEnabled = settings.expressiveVoiceEnabled ?? true;
  const learningEnabled = settings.styleLearningEnabled ?? true;
  const learningRate = clamp(settings.styleLearningRate ?? 0.85, 0, 1);
  const globalIntensity = clamp(settings.emotionIntensity ?? 1, 0.5, 1.6);
  const perEmotionIntensity = clamp(settings.emotionIntensityByPreset?.[emotion] ?? 1, 0.6, 1.8);
  const intensity = clamp(globalIntensity * perEmotionIntensity, 0.5, 1.8);

  const anchorPitch = clamp(settings.pitch, 0.3, 2.0);
  const anchorRate = clamp(settings.rate, 0.5, 1.8);

  if (!expressiveEnabled) {
    return {
      pitch: anchorPitch,
      rate: anchorRate,
      elevenLabsVoiceSettings: neutral.elevenLabsVoiceSettings,
    };
  }

  const pitchMultiplier = emotionPreset.pitch / neutral.pitch;
  const rateMultiplier = emotionPreset.rate / neutral.rate;

  const targetPitch = anchorPitch * pitchMultiplier;
  const targetRate = anchorRate * rateMultiplier;

  const blend = learningEnabled ? learningRate : 1;
  const shapedPitch = anchorPitch + (targetPitch - anchorPitch) * blend * intensity;
  const shapedRate = anchorRate + (targetRate - anchorRate) * blend * intensity;

  const emotionVoice = emotionPreset.elevenLabsVoiceSettings;
  const neutralVoice = neutral.elevenLabsVoiceSettings;
  const shapedVoice = {
    stability: clamp(
      neutralVoice.stability + (emotionVoice.stability - neutralVoice.stability) * blend * intensity,
      0,
      1
    ),
    similarity_boost: clamp(
      neutralVoice.similarity_boost + (emotionVoice.similarity_boost - neutralVoice.similarity_boost) * blend,
      0,
      1
    ),
    style: clamp(neutralVoice.style + (emotionVoice.style - neutralVoice.style) * blend * intensity, 0, 1),
    use_speaker_boost: emotionVoice.use_speaker_boost,
  };

  return {
    pitch: clamp(shapedPitch, 0.3, 2.0),
    rate: clamp(shapedRate, 0.5, 1.8),
    elevenLabsVoiceSettings: shapedVoice,
  };
};

let currentSound: Audio.Sound | null = null;
let currentAudioFile: string | null = null;
let currentWebAudio: HTMLAudioElement | null = null;
let currentWebAudioUrl: string | null = null;
let lastSpeechSignature: string | null = null;
let lastSpeechAt = 0;
let warnedLocalBridgeUnavailable = false;
let localBridgeFailureUntil = 0;

const LOCAL_BRIDGE_FAILURE_COOLDOWN_MS = 8000;

type LocalVoicePackRecord = {
  id: string;
  locale: string | null;
  age_band: string | null;
  gender: string | null;
  manifest_uri: string | null;
  is_installed: number;
};

const getProprietaryTtsUrl = (): string | null => {
  const raw = process.env.EXPO_PUBLIC_PROPRIETARY_TTS_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
};

const getChatterboxTtsUrl = (): string | null => {
  const raw = process.env.EXPO_PUBLIC_CHATTERBOX_TTS_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
};

const hashToSeed = (input: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) % 2147483647;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
};

const detectAudioFormat = (arrayBuffer: ArrayBuffer): { mimeType: string; extension: 'mp3' | 'wav' } => {
  const bytes = new Uint8Array(arrayBuffer);

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x41 && // A
    bytes[10] === 0x56 && // V
    bytes[11] === 0x45 // E
  ) {
    return { mimeType: 'audio/wav', extension: 'wav' };
  }

  return { mimeType: 'audio/mpeg', extension: 'mp3' };
};

const stopAudioPlayback = async () => {
  if (currentWebAudio) {
    try {
      currentWebAudio.pause();
      currentWebAudio.currentTime = 0;
    } catch {
      // Ignore cleanup issues for browser audio instances.
    }
    currentWebAudio = null;
  }

  if (currentWebAudioUrl) {
    try {
      URL.revokeObjectURL(currentWebAudioUrl);
    } catch {
      // Best-effort cleanup.
    }
    currentWebAudioUrl = null;
  }

  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // No-op; sound may already be released.
    }
    currentSound = null;
  }

  if (currentAudioFile) {
    try {
      await FileSystem.deleteAsync(currentAudioFile, { idempotent: true });
    } catch {
      // Best-effort temp file cleanup.
    }
    currentAudioFile = null;
  }
};

const playAudioBuffer = async (arrayBuffer: ArrayBuffer, filePrefix: string) => {
  await stopAudioPlayback();
  const audioFormat = detectAudioFormat(arrayBuffer);

  if (Platform.OS === 'web') {
    const blob = new Blob([arrayBuffer], { type: audioFormat.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const webAudio = new globalThis.Audio(objectUrl);

    currentWebAudio = webAudio;
    currentWebAudioUrl = objectUrl;

    webAudio.onended = () => {
      void stopAudioPlayback();
    };

    await webAudio.play();
    return;
  }

  const base64 = bytesToBase64(new Uint8Array(arrayBuffer));
  const fileName = `${filePrefix}-${Date.now()}.${audioFormat.extension}`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  currentAudioFile = fileUri;
  const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
  currentSound = sound;

  sound.setOnPlaybackStatusUpdate(status => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      void stopAudioPlayback();
    }
  });
};

export const stopAllSpeech = async () => {
  Speech.stop();
  await stopAudioPlayback();
};

const speakWithNative = async (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset = 'neutral') => {
  const emotionSettings = buildRuntimeEmotionSettings(settings, emotion);
  const preferredVoice = await resolvePreferredLocalVoiceId();
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: emotionSettings.pitch,
    rate: emotionSettings.rate,
    ...(preferredVoice ? { voice: preferredVoice } : {}),
  });
};

// Local engine placeholder for fully offline custom voice runtime.
// Until a native on-device model is integrated, this uses native speech.
const speakWithLocal = async (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset) => {
  const selectedPackId = settings.localVoicePackId?.trim();
  if (!selectedPackId) {
    throw new Error('No local voice pack selected');
  }

  const selectedPack = await getFirstSql<LocalVoicePackRecord>(
    `SELECT id, locale, age_band, gender, manifest_uri, is_installed
     FROM local_voice_packs
     WHERE id=?
     LIMIT 1;`,
    selectedPackId
  );

  if (!selectedPack) {
    throw new Error(`Selected local voice pack not found: ${selectedPackId}`);
  }

  if (selectedPack.is_installed !== 1) {
    throw new Error(`Selected local voice pack is not installed: ${selectedPackId}`);
  }

  registerPiperWebBridgeFromEnv();
  registerPiperNativeModuleIfAvailable();
  ensureLocalTtsBridgeInstalled();

  const bridge = getLocalTtsBridge();

  if (bridge?.synthesize) {
    if (Date.now() < localBridgeFailureUntil) {
      await speakWithNative(text, settings, emotion);
      return;
    }

    const emotionSettings = buildRuntimeEmotionSettings(settings, emotion);
    const spokenText = shapeTextForEmotion(text, emotion);
    const piperConfig = derivePiperSynthesisConfig({
      emotion,
      pitch: emotionSettings.pitch,
      rate: emotionSettings.rate,
      elevenLabsVoiceSettings: emotionSettings.elevenLabsVoiceSettings,
    });

    let result: Awaited<ReturnType<typeof bridge.synthesize>>;
    try {
      result = await bridge.synthesize({
        text: spokenText,
        emotion,
        runtime: 'piper',
        voicePackId: selectedPackId,
        voicePackManifestUri: selectedPack.manifest_uri ?? undefined,
        voicePackLocale: selectedPack.locale ?? undefined,
        voicePackAgeBand: selectedPack.age_band ?? undefined,
        voicePackGender: selectedPack.gender ?? undefined,
        pitch: emotionSettings.pitch,
        rate: emotionSettings.rate,
        piperConfig,
      });
      localBridgeFailureUntil = 0;
    } catch (error) {
      localBridgeFailureUntil = Date.now() + LOCAL_BRIDGE_FAILURE_COOLDOWN_MS;
      throw error;
    }

    if (typeof result === 'string') {
      const binary = globalThis.atob(result);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      await playAudioBuffer(bytes.buffer, 'local-bridge');
      return;
    }

    if (result instanceof Uint8Array) {
      const copied = new Uint8Array(result);
      await playAudioBuffer(copied.buffer, 'local-bridge');
      return;
    }

    await playAudioBuffer(result, 'local-bridge');
    return;
  }

  if (!warnedLocalBridgeUnavailable) {
    warnedLocalBridgeUnavailable = true;
    console.warn(
      'Local TTS bridge unavailable. Falling back to native TTS. On web, run voice_lab/scripts/piper_web_bridge_server.py and set EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL.'
    );
  }

  // Fallback until a local bridge is installed.
  await speakWithNative(text, settings, emotion);
};

const clampAdaptive = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

export const recordVoiceFeedback = async (emotion: EmotionPreset, feedback: 'flat' | 'good' | 'intense') => {
  const signal = feedback === 'flat' ? 1 : feedback === 'intense' ? -1 : 0;
  await runSql(
    `INSERT INTO voice_learning_events (emotion, signal, replay_ms, text_len) VALUES (?, ?, NULL, NULL);`,
    emotion,
    signal
  );
};

const computeAdaptiveAdjustment = async (emotion: EmotionPreset) => {
  const feedbackRow = await getFirstSql<{ avg_signal: number | null }>(
    `SELECT AVG(signal) AS avg_signal
     FROM (
       SELECT signal
       FROM voice_learning_events
       WHERE emotion=? AND signal IS NOT NULL
       ORDER BY id DESC
       LIMIT 30
     );`,
    emotion
  );

  const replayRow = await getFirstSql<{ quick_replay_rate: number | null }>(
    `SELECT AVG(CASE WHEN replay_ms BETWEEN 200 AND 3500 THEN 1.0 ELSE 0.0 END) AS quick_replay_rate
     FROM (
       SELECT replay_ms
       FROM voice_learning_events
       WHERE emotion=? AND replay_ms IS NOT NULL
       ORDER BY id DESC
       LIMIT 40
     );`,
    emotion
  );

  const avgSignal = feedbackRow?.avg_signal ?? 0;
  const quickReplayRate = replayRow?.quick_replay_rate ?? 0;

  const feedbackTerm = clampAdaptive(avgSignal * 0.16, -0.2, 0.2);
  const replayTerm = clampAdaptive(quickReplayRate * 0.08, 0, 0.12);

  return clampAdaptive(feedbackTerm + replayTerm, -0.22, 0.22);
};

const withAdaptiveEmotionSettings = async (
  text: string,
  settings: RuntimeTtsSettings,
  emotion: EmotionPreset
) => {
  if (!settings.adaptiveStyleEnabled) {
    return settings;
  }

  try {
    const adjustment = await computeAdaptiveAdjustment(emotion);
    const base = settings.emotionIntensityByPreset?.[emotion] ?? 1;
    const next = clampAdaptive(base * (1 + adjustment), 0.6, 1.8);

    return {
      ...settings,
      emotionIntensityByPreset: {
        ...(settings.emotionIntensityByPreset ?? {}),
        [emotion]: next,
      },
    };
  } catch (error) {
    console.warn('Adaptive voice settings unavailable:', error);
    return settings;
  }
};

const logVoiceLearningEvent = async (text: string, emotion: EmotionPreset) => {
  const now = Date.now();
  const signature = `${emotion}|${normalizeSpeechText(text).toLowerCase()}`;
  const replayMs = lastSpeechSignature === signature ? now - lastSpeechAt : null;

  lastSpeechSignature = signature;
  lastSpeechAt = now;

  await runSql(
    `INSERT INTO voice_learning_events (emotion, signal, replay_ms, text_len) VALUES (?, NULL, ?, ?);`,
    emotion,
    replayMs,
    text.length
  );
};

const shapeTextForEmotion = (text: string, emotion: EmotionPreset): string => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const pauseFriendly = trimmed.replace(/[,:;]+/g, ', ');

  switch (emotion) {
    case 'happy':
      return trimmed.replace(/[.!?]*$/, '!!');
    case 'sad':
      return pauseFriendly.replace(/[!?]+/g, '.').replace(/[.]*$/, '...');
    case 'angry':
      return trimmed.toUpperCase().replace(/[.!?]*$/, '!');
    case 'calm':
      return pauseFriendly.replace(/[!?]+/g, '.').replace(/[.]*$/, '...');
    case 'neutral':
    default:
      return trimmed;
  }
};

const speakWithElevenLabs = async (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset) => {
  const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY');
  }

  const voiceId = settings.elevenLabsVoiceId?.trim() || process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID;
  const emotionSettings = buildRuntimeEmotionSettings(settings, emotion);
  const spokenText = shapeTextForEmotion(text, emotion);
  const seed = hashToSeed(`${voiceId}:${emotion}:${spokenText}`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: spokenText,
      model_id: 'eleven_multilingual_v2',
      seed,
      voice_settings: emotionSettings.elevenLabsVoiceSettings,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await playAudioBuffer(arrayBuffer, 'elevenlabs');
};

const speakWithProprietary = async (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset) => {
  const baseUrl = getProprietaryTtsUrl();
  if (!baseUrl) {
    throw new Error('Missing EXPO_PUBLIC_PROPRIETARY_TTS_URL');
  }

  const voiceId = process.env.EXPO_PUBLIC_PROPRIETARY_TTS_VOICE_ID?.trim() || process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID;
  const apiKey = process.env.EXPO_PUBLIC_PROPRIETARY_TTS_API_KEY?.trim();
  const emotionSettings = buildRuntimeEmotionSettings(settings, emotion);
  const spokenText = shapeTextForEmotion(text, emotion);
  const headers: Record<string, string> = {
    Accept: 'audio/mpeg',
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`${baseUrl}/synthesize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: spokenText,
      emotion,
      pitch: emotionSettings.pitch,
      rate: emotionSettings.rate,
      voiceId,
      format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Proprietary TTS failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await playAudioBuffer(arrayBuffer, 'proprietary');
};

const speakWithChatterbox = async (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset) => {
  const baseUrl = getChatterboxTtsUrl();
  if (!baseUrl) {
    throw new Error('Missing EXPO_PUBLIC_CHATTERBOX_TTS_URL');
  }

  const emotionSettings = buildRuntimeEmotionSettings(settings, emotion);
  const spokenText = shapeTextForEmotion(text, emotion);
  const apiKey = process.env.EXPO_PUBLIC_CHATTERBOX_TTS_API_KEY?.trim();
  const voiceId = process.env.EXPO_PUBLIC_CHATTERBOX_VOICE_ID?.trim();
  const headers: Record<string, string> = {
    Accept: 'audio/mpeg, audio/wav',
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/synthesize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: spokenText,
      emotion,
      pitch: emotionSettings.pitch,
      rate: emotionSettings.rate,
      voiceId,
      format: 'mp3',
      model: 'chatterbox-turbo',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Chatterbox TTS failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await playAudioBuffer(arrayBuffer, 'chatterbox');
};

type TtsProvider = {
  id: TtsEngine;
  isAvailable: (settings: RuntimeTtsSettings) => boolean;
  speak: (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset) => Promise<void>;
};

const PROVIDERS: Record<TtsEngine, TtsProvider> = {
  local: {
    id: 'local',
    isAvailable: () => true,
    speak: speakWithLocal,
  },
  native: {
    id: 'native',
    isAvailable: () => true,
    speak: speakWithNative,
  },
  elevenlabs: {
    id: 'elevenlabs',
    isAvailable: settings => !settings.offlineOnlyMode && !isForceLocalOnlyMode() && Boolean(process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY),
    speak: speakWithElevenLabs,
  },
  proprietary: {
    id: 'proprietary',
    isAvailable: settings => !settings.offlineOnlyMode && !isForceLocalOnlyMode() && Boolean(getProprietaryTtsUrl()),
    speak: speakWithProprietary,
  },
  chatterbox: {
    id: 'chatterbox',
    isAvailable: settings => !settings.offlineOnlyMode && !isForceLocalOnlyMode() && Boolean(getChatterboxTtsUrl()),
    speak: speakWithChatterbox,
  },
};

export const speakText = async (text: string, settings: RuntimeTtsSettings, emotion: EmotionPreset = 'neutral') => {
  const normalizedText = normalizeSpeechText(text);
  if (!normalizedText) return;

  const runtimeSettings = await withAdaptiveEmotionSettings(normalizedText, settings, emotion);
  const forceLocalOnly = isForceLocalOnlyMode();
  const effectiveEngine: TtsEngine = forceLocalOnly && runtimeSettings.engine !== 'local' && runtimeSettings.engine !== 'native'
    ? 'native'
    : runtimeSettings.engine;

  const providerOrder = getProviderFallbackOrder(effectiveEngine);
  let lastError: unknown = null;

  for (const providerId of providerOrder) {
    const provider = PROVIDERS[providerId];
    if (!provider.isAvailable(runtimeSettings)) continue;

    try {
      await provider.speak(normalizedText, runtimeSettings, emotion);
      void logVoiceLearningEvent(normalizedText, emotion).catch(error => {
        console.warn('Voice learning event logging failed:', error);
      });
      return;
    } catch (error) {
      lastError = error;
      console.warn(`TTS provider ${provider.id} failed:`, error);
    }
  }

  if (effectiveEngine !== 'native') {
    console.warn('Falling back to native speech after provider failures.', lastError);
  }

  await speakWithNative(normalizedText, runtimeSettings, emotion);
  void logVoiceLearningEvent(normalizedText, emotion).catch(error => {
    console.warn('Voice learning event logging failed:', error);
  });
};
