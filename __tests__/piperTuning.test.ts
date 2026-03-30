import { derivePiperSynthesisConfig } from '../src/utils/piperTuning';

describe('derivePiperSynthesisConfig', () => {
  it('returns bounded Piper values', () => {
    const config = derivePiperSynthesisConfig({
      emotion: 'neutral',
      pitch: 1,
      rate: 0.92,
      elevenLabsVoiceSettings: {
        stability: 0.88,
        similarity_boost: 0.9,
        style: 0.14,
      },
    });

    expect(config.lengthScale).toBeGreaterThanOrEqual(0.68);
    expect(config.lengthScale).toBeLessThanOrEqual(1.5);
    expect(config.noiseScale).toBeGreaterThanOrEqual(0.45);
    expect(config.noiseScale).toBeLessThanOrEqual(1.25);
    expect(config.noiseW).toBeGreaterThanOrEqual(0.45);
    expect(config.noiseW).toBeLessThanOrEqual(1.25);
    expect(config.sentenceSilenceSeconds).toBeGreaterThanOrEqual(0.04);
    expect(config.sentenceSilenceSeconds).toBeLessThanOrEqual(0.3);
    expect(config.pitchShiftSemitones).toBeGreaterThanOrEqual(-7);
    expect(config.pitchShiftSemitones).toBeLessThanOrEqual(7);
  });

  it('makes happy style more expressive than neutral style', () => {
    const neutral = derivePiperSynthesisConfig({
      emotion: 'neutral',
      pitch: 1,
      rate: 0.92,
      elevenLabsVoiceSettings: {
        stability: 0.88,
        similarity_boost: 0.9,
        style: 0.14,
      },
    });

    const happy = derivePiperSynthesisConfig({
      emotion: 'happy',
      pitch: 1.2,
      rate: 1.12,
      elevenLabsVoiceSettings: {
        stability: 0.42,
        similarity_boost: 0.82,
        style: 0.85,
      },
    });

    expect(happy.noiseScale).toBeGreaterThan(neutral.noiseScale);
    expect(happy.styleIntensity).toBeGreaterThan(neutral.styleIntensity);
    expect(happy.sentenceSilenceSeconds).toBeLessThan(neutral.sentenceSilenceSeconds);
  });

  it('slows down calm/sad with longer pauses than angry', () => {
    const sad = derivePiperSynthesisConfig({
      emotion: 'sad',
      pitch: 0.7,
      rate: 0.65,
      elevenLabsVoiceSettings: {
        stability: 0.97,
        similarity_boost: 0.94,
        style: 0.22,
      },
    });

    const angry = derivePiperSynthesisConfig({
      emotion: 'angry',
      pitch: 1.2,
      rate: 1.25,
      elevenLabsVoiceSettings: {
        stability: 0.28,
        similarity_boost: 0.74,
        style: 0.96,
      },
    });

    expect(sad.lengthScale).toBeGreaterThan(angry.lengthScale);
    expect(sad.sentenceSilenceSeconds).toBeGreaterThan(angry.sentenceSilenceSeconds);
  });
});
