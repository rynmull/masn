import { getEmotionSettings } from '../src/utils/ttsPresets';

describe('getEmotionSettings', () => {
  it('returns neutral preset values', () => {
    expect(getEmotionSettings('neutral')).toEqual(expect.objectContaining({ pitch: 1.0, rate: 0.92 }));
  });

  it('returns happy preset values', () => {
    expect(getEmotionSettings('happy')).toEqual(expect.objectContaining({ pitch: 1.45, rate: 1.16 }));
  });

  it('returns sad preset values', () => {
    expect(getEmotionSettings('sad')).toEqual(expect.objectContaining({ pitch: 0.62, rate: 0.58 }));
  });

  it('returns angry preset values', () => {
    expect(getEmotionSettings('angry')).toEqual(expect.objectContaining({ pitch: 1.22, rate: 1.32 }));
  });

  it('returns calm preset values', () => {
    expect(getEmotionSettings('calm')).toEqual(expect.objectContaining({ pitch: 0.72, rate: 0.64 }));
  });
});
