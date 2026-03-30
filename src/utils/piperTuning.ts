import type { EmotionPreset } from './ttsPresets';

export interface PiperSynthesisConfig {
  lengthScale: number;
  noiseScale: number;
  noiseW: number;
  sentenceSilenceSeconds: number;
  pitchShiftSemitones: number;
  styleIntensity: number;
}

export interface PiperTuningInput {
  emotion: EmotionPreset;
  pitch: number;
  rate: number;
  elevenLabsVoiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const getBaseSilenceForEmotion = (emotion: EmotionPreset): number => {
  switch (emotion) {
    case 'happy':
      return 0.08;
    case 'sad':
      return 0.2;
    case 'angry':
      return 0.06;
    case 'calm':
      return 0.22;
    case 'neutral':
    default:
      return 0.12;
  }
};

export const derivePiperSynthesisConfig = (input: PiperTuningInput): PiperSynthesisConfig => {
  const stability = clamp(input.elevenLabsVoiceSettings.stability, 0, 1);
  const similarityBoost = clamp(input.elevenLabsVoiceSettings.similarity_boost, 0, 1);
  const style = clamp(input.elevenLabsVoiceSettings.style, 0, 1);

  // Piper timing is controlled by lengthScale where lower values speak faster.
  const lengthScale = clamp(1 / Math.max(input.rate, 0.45), 0.68, 1.5);

  // Lower stability in ElevenLabs generally maps to more expressive variance in Piper noise params.
  const noiseScale = clamp(0.72 + (1 - stability) * 0.34 + style * 0.08, 0.45, 1.25);
  const noiseW = clamp(0.7 + (1 - similarityBoost) * 0.42 + style * 0.06, 0.45, 1.25);

  // Preserve phrase pacing differences between emotion presets.
  const sentenceSilenceSeconds = clamp(
    getBaseSilenceForEmotion(input.emotion) + (1 - input.rate) * 0.03,
    0.04,
    0.3
  );

  const pitchShiftSemitones = clamp(12 * Math.log2(Math.max(input.pitch, 0.3)), -7, 7);
  const styleIntensity = clamp(style, 0, 1);

  return {
    lengthScale,
    noiseScale,
    noiseW,
    sentenceSilenceSeconds,
    pitchShiftSemitones,
    styleIntensity,
  };
};
