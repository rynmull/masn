export type EmotionPreset = 'neutral' | 'happy' | 'sad' | 'angry' | 'calm';

export interface TtsPresetSettings {
  pitch: number;
  rate: number;
  symbolTerm: string;
  shortLabel: string;
  elevenLabsVoiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

export const EMOTION_OPTIONS: Array<{
  id: EmotionPreset;
  label: string;
  symbolTerm: string;
  shortLabel: string;
}> = [
  { id: 'neutral', label: 'Neutral', symbolTerm: 'talk', shortLabel: 'N' },
  { id: 'happy', label: 'Happy', symbolTerm: 'happy', shortLabel: 'H' },
  { id: 'sad', label: 'Sad', symbolTerm: 'sad', shortLabel: 'S' },
  { id: 'angry', label: 'Angry', symbolTerm: 'angry', shortLabel: 'A' },
  { id: 'calm', label: 'Calm', symbolTerm: 'calm', shortLabel: 'C' },
];

const PRESET_MAP: Record<EmotionPreset, TtsPresetSettings> = {
  neutral: {
    pitch: 1.0,
    rate: 0.92,
    symbolTerm: 'talk',
    shortLabel: 'N',
    elevenLabsVoiceSettings: {
      stability: 0.88,
      similarity_boost: 0.9,
      style: 0.14,
      use_speaker_boost: true,
    },
  },
  happy: {
    pitch: 1.45,
    rate: 1.16,
    symbolTerm: 'happy',
    shortLabel: 'H',
    elevenLabsVoiceSettings: {
      stability: 0.42,
      similarity_boost: 0.82,
      style: 0.85,
      use_speaker_boost: true,
    },
  },
  sad: {
    pitch: 0.62,
    rate: 0.58,
    symbolTerm: 'sad',
    shortLabel: 'S',
    elevenLabsVoiceSettings: {
      stability: 0.97,
      similarity_boost: 0.94,
      style: 0.22,
      use_speaker_boost: true,
    },
  },
  angry: {
    pitch: 1.22,
    rate: 1.32,
    symbolTerm: 'angry',
    shortLabel: 'A',
    elevenLabsVoiceSettings: {
      stability: 0.28,
      similarity_boost: 0.74,
      style: 0.96,
      use_speaker_boost: true,
    },
  },
  calm: {
    pitch: 0.72,
    rate: 0.64,
    symbolTerm: 'calm',
    shortLabel: 'C',
    elevenLabsVoiceSettings: {
      stability: 0.99,
      similarity_boost: 0.97,
      style: 0.06,
      use_speaker_boost: true,
    },
  },
};

export const getEmotionSettings = (emotion: EmotionPreset): TtsPresetSettings => {
  return PRESET_MAP[emotion];
};
