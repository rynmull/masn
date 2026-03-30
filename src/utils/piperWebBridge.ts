import { Platform } from 'react-native';
import { getLocalTtsBridge, installLocalTtsBridge } from './localTtsBridge';

const DEFAULT_DEV_BRIDGE_URL = 'http://127.0.0.1:8765';

const normalizeBaseUrl = (raw?: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
};

const resolveBridgeBaseUrl = (): string | null => {
  const fromEnv = normalizeBaseUrl(process.env.EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (__DEV__) {
    return DEFAULT_DEV_BRIDGE_URL;
  }

  return null;
};

let attemptedInstall = false;
let warnedMissingBridge = false;

export const registerPiperWebBridgeFromEnv = (): boolean => {
  if (Platform.OS !== 'web') return false;

  if (getLocalTtsBridge()) {
    return true;
  }

  if (attemptedInstall) {
    return false;
  }

  attemptedInstall = true;

  const baseUrl = resolveBridgeBaseUrl();
  if (!baseUrl) {
    if (!warnedMissingBridge) {
      warnedMissingBridge = true;
      console.warn('Piper web bridge not configured. Set EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL to enable local voice runtime.');
    }
    return false;
  }

  installLocalTtsBridge({
    synthesize: async payload => {
      const response = await fetch(`${baseUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Piper web bridge failed (${response.status}): ${errorText.slice(0, 240)}`);
      }

      return response.arrayBuffer();
    },
    getInfo: async () => {
      try {
        const response = await fetch(`${baseUrl}/info`, { method: 'GET' });
        if (!response.ok) {
          return { provider: 'piper-web-bridge' };
        }
        const data = (await response.json()) as { provider?: string; version?: string };
        return {
          provider: data.provider ?? 'piper-web-bridge',
          version: data.version,
        };
      } catch {
        return { provider: 'piper-web-bridge' };
      }
    },
  });

  return true;
};
