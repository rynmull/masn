import {
  ensureLocalTtsBridgeInstalled,
  getLocalTtsBridge,
  installLocalTtsBridgeFromNativeModule,
  installLocalTtsBridge,
  isLocalTtsBridgeInstalled,
  registerNativeLocalTtsModule,
} from '../src/utils/localTtsBridge';

describe('localTtsBridge helpers', () => {
  afterEach(() => {
    installLocalTtsBridge(null);
    registerNativeLocalTtsModule(null);
  });

  it('installs and retrieves bridge', () => {
    const bridge = {
      synthesize: async () => new ArrayBuffer(8),
    };

    installLocalTtsBridge(bridge);

    expect(isLocalTtsBridgeInstalled()).toBe(true);
    expect(getLocalTtsBridge()).toBe(bridge);
  });

  it('uninstalls bridge cleanly', () => {
    const bridge = {
      synthesize: async () => new ArrayBuffer(8),
    };

    installLocalTtsBridge(bridge);
    installLocalTtsBridge(null);

    expect(isLocalTtsBridgeInstalled()).toBe(false);
    expect(getLocalTtsBridge()).toBeNull();
  });

  it('installs bridge from registered native module', async () => {
    const synthesize = jest.fn(async () => new ArrayBuffer(8));
    registerNativeLocalTtsModule({
      synthesize,
      getInfo: () => ({ provider: 'native-module', version: '1.0.0' }),
    });

    expect(installLocalTtsBridgeFromNativeModule()).toBe(true);
    expect(isLocalTtsBridgeInstalled()).toBe(true);

    const bridge = getLocalTtsBridge();
    expect(bridge).not.toBeNull();

    await bridge?.synthesize({
      text: 'Need water',
      emotion: 'neutral',
      voicePackId: 'adult_female_en_us_a1',
      voicePackManifestUri: 'voice_lab/packs/adult_female_en_us_a1/manifest.json',
      voicePackLocale: 'en-US',
      voicePackAgeBand: 'adult',
      voicePackGender: 'female',
      pitch: 1,
      rate: 0.9,
    });

    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(synthesize).toHaveBeenCalledWith(
      expect.objectContaining({
        voicePackId: 'adult_female_en_us_a1',
        voicePackLocale: 'en-US',
      })
    );
  });

  it('ensureLocalTtsBridgeInstalled hydrates from native module', () => {
    registerNativeLocalTtsModule({
      synthesize: async () => new ArrayBuffer(8),
    });

    expect(isLocalTtsBridgeInstalled()).toBe(false);
    expect(ensureLocalTtsBridgeInstalled()).toBe(true);
    expect(isLocalTtsBridgeInstalled()).toBe(true);
  });
});
