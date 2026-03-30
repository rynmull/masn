import type { EmotionPreset } from './ttsPresets';

export type TtsEngine = 'native' | 'elevenlabs' | 'proprietary' | 'local';

export interface SpeechCacheKeyInput {
  text: string;
  emotion: EmotionPreset;
  engine: TtsEngine;
  pitch: number;
  rate: number;
  voiceId?: string;
  modelVersion?: string;
}

export const normalizeSpeechText = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

export const getProviderFallbackOrder = (engine: TtsEngine): TtsEngine[] => {
  if (engine === 'local') {
    return ['local', 'native'];
  }
  if (engine === 'proprietary') {
    return ['proprietary', 'native'];
  }
  if (engine === 'elevenlabs') {
    return ['elevenlabs', 'native'];
  }
  return ['native'];
};

export const buildSpeechCacheKey = ({
  text,
  emotion,
  engine,
  pitch,
  rate,
  voiceId = '',
  modelVersion = 'v1',
}: SpeechCacheKeyInput): string => {
  const normalizedText = normalizeSpeechText(text).toLowerCase();
  const normalizedVoice = voiceId.trim().toLowerCase();

  return [
    'speech-cache',
    modelVersion,
    engine,
    emotion,
    normalizedVoice,
    pitch.toFixed(3),
    rate.toFixed(3),
    normalizedText,
  ].join('|');
};