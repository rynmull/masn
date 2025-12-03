import * as Speech from 'expo-speech';

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voiceId?: string;
}

export const speakPhrase = (text: string, options?: SpeakOptions) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  Speech.stop();
  Speech.speak(trimmed, {
    voice: options?.voiceId,
    rate: options?.rate ?? 0.9,
    pitch: options?.pitch ?? 1
  });
};

export const stopSpeech = () => Speech.stop();
