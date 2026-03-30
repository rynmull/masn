import type { EmotionPreset } from './ttsPresets';
import type { PiperSynthesisConfig } from './piperTuning';

export interface LocalSynthesisPayload {
  text: string;
  emotion: EmotionPreset;
  runtime?: 'piper';
  voicePackId: string;
  voicePackManifestUri?: string;
  voicePackLocale?: string;
  voicePackAgeBand?: string;
  voicePackGender?: string;
  pitch: number;
  rate: number;
  piperConfig?: PiperSynthesisConfig;
}

export type LocalSynthesisResult = ArrayBuffer | Uint8Array | string;

export interface LocalTtsBridge {
  synthesize: (payload: LocalSynthesisPayload) => Promise<LocalSynthesisResult>;
  getInfo?: () => Promise<{ provider: string; version?: string } | null> | { provider: string; version?: string } | null;
}

export interface NativeLocalTtsModule {
  synthesize: (payload: LocalSynthesisPayload) => Promise<LocalSynthesisResult>;
  getInfo?: () => Promise<{ provider: string; version?: string } | null> | { provider: string; version?: string } | null;
}

const BRIDGE_KEY = '__MASN_LOCAL_TTS_BRIDGE__';
const NATIVE_BRIDGE_KEY = '__MASN_NATIVE_LOCAL_TTS__';

type GlobalWithBridge = typeof globalThis & {
  [BRIDGE_KEY]?: LocalTtsBridge;
  [NATIVE_BRIDGE_KEY]?: NativeLocalTtsModule;
};

const getGlobal = (): GlobalWithBridge => globalThis as GlobalWithBridge;

export const installLocalTtsBridge = (bridge: LocalTtsBridge | null) => {
  const target = getGlobal();
  if (!bridge) {
    delete target[BRIDGE_KEY];
    return;
  }
  target[BRIDGE_KEY] = bridge;
};

export const registerNativeLocalTtsModule = (module: NativeLocalTtsModule | null) => {
  const target = getGlobal();
  if (!module) {
    delete target[NATIVE_BRIDGE_KEY];
    return;
  }
  target[NATIVE_BRIDGE_KEY] = module;
};

export const installLocalTtsBridgeFromNativeModule = (): boolean => {
  const target = getGlobal();
  const nativeModule = target[NATIVE_BRIDGE_KEY];
  if (!nativeModule?.synthesize) {
    return false;
  }

  installLocalTtsBridge({
    synthesize: payload => nativeModule.synthesize(payload),
    getInfo: nativeModule.getInfo,
  });

  return true;
};

export const ensureLocalTtsBridgeInstalled = (): boolean => {
  if (isLocalTtsBridgeInstalled()) {
    return true;
  }
  return installLocalTtsBridgeFromNativeModule();
};

export const getLocalTtsBridge = (): LocalTtsBridge | null => {
  const bridge = getGlobal()[BRIDGE_KEY];
  return bridge ?? null;
};

export const isLocalTtsBridgeInstalled = (): boolean => {
  return getLocalTtsBridge() !== null;
};

export const getLocalTtsBridgeInfo = async (): Promise<{ provider: string; version?: string } | null> => {
  const bridge = getLocalTtsBridge();
  if (!bridge?.getInfo) return null;
  return bridge.getInfo();
};
