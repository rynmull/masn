import * as Speech from 'expo-speech';

export const speak = (text: string, voiceId?: string) => {
  if (!text.trim()) return;
  Speech.stop();
  Speech.speak(text, {
    voice: voiceId,
    rate: 0.9
  });
};

export const stop = () => Speech.stop();
