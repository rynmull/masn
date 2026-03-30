import { NativeModules } from 'react-native';
import { registerNativeLocalTtsModule, type NativeLocalTtsModule } from './localTtsBridge';

let attemptedRegistration = false;

const isValidNativeModule = (candidate: unknown): candidate is NativeLocalTtsModule => {
  return Boolean(candidate && typeof (candidate as NativeLocalTtsModule).synthesize === 'function');
};

export const registerPiperNativeModuleIfAvailable = (): boolean => {
  if (attemptedRegistration) {
    return false;
  }

  attemptedRegistration = true;

  const candidate =
    (NativeModules as Record<string, unknown>).MasnLocalTtsPiper ??
    (NativeModules as Record<string, unknown>).MasnLocalTts;

  if (!isValidNativeModule(candidate)) {
    return false;
  }

  registerNativeLocalTtsModule(candidate);
  return true;
};
