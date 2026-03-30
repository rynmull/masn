import { buildSpeechCacheKey, getProviderFallbackOrder, normalizeSpeechText } from '../src/utils/ttsEngine';

describe('ttsEngine helpers', () => {
  it('normalizes speech text by trimming and collapsing spaces', () => {
    expect(normalizeSpeechText('  Hello    world   ')).toBe('Hello world');
  });

  it('returns provider order for native engine', () => {
    expect(getProviderFallbackOrder('native')).toEqual(['native']);
  });

  it('returns provider order for elevenlabs engine', () => {
    expect(getProviderFallbackOrder('elevenlabs')).toEqual(['elevenlabs', 'native']);
  });

  it('returns provider order for proprietary engine', () => {
    expect(getProviderFallbackOrder('proprietary')).toEqual(['proprietary', 'native']);
  });

  it('returns provider order for local engine', () => {
    expect(getProviderFallbackOrder('local')).toEqual(['local', 'native']);
  });

  it('returns provider order for chatterbox engine', () => {
    expect(getProviderFallbackOrder('chatterbox')).toEqual(['chatterbox', 'native']);
  });

  it('builds deterministic cache keys for equivalent text', () => {
    const keyA = buildSpeechCacheKey({
      text: '  Need   help  now ',
      emotion: 'neutral',
      engine: 'proprietary',
      pitch: 1,
      rate: 0.9,
      voiceId: 'Voice-01',
      modelVersion: 'alpha-1',
    });

    const keyB = buildSpeechCacheKey({
      text: 'need help now',
      emotion: 'neutral',
      engine: 'proprietary',
      pitch: 1,
      rate: 0.9,
      voiceId: 'voice-01',
      modelVersion: 'alpha-1',
    });

    expect(keyA).toBe(keyB);
  });

  it('changes cache key when synthesis parameters change', () => {
    const base = buildSpeechCacheKey({
      text: 'I need water',
      emotion: 'neutral',
      engine: 'native',
      pitch: 1,
      rate: 0.9,
      modelVersion: 'alpha-1',
    });

    const changed = buildSpeechCacheKey({
      text: 'I need water',
      emotion: 'neutral',
      engine: 'native',
      pitch: 1.1,
      rate: 0.9,
      modelVersion: 'alpha-1',
    });

    expect(base).not.toBe(changed);
  });
});
