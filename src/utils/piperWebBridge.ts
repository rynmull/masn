import { Platform } from 'react-native';
import { getLocalTtsBridge, installLocalTtsBridge } from './localTtsBridge';

const DEFAULT_DEV_BRIDGE_URL = 'http://127.0.0.1:8765';

const isLikelyLocalHost = (host: string): boolean => {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
};

const buildGithubDevForwardedUrl = (protocol: string, host: string): string | null => {
  const match = host.match(/^(.*)-\d+\.app\.github\.dev$/);
  if (!match) return null;
  return `${protocol}//${match[1]}-8765.app.github.dev`;
};

const normalizeBaseUrl = (raw?: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
};

const buildBridgeBaseUrls = (): string[] => {
  const urls: string[] = [];

  const fromEnv = normalizeBaseUrl(process.env.EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL);
  if (fromEnv) {
    urls.push(fromEnv);
  }

  if (__DEV__ && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';

    const githubForwarded = buildGithubDevForwardedUrl(protocol, host);
    if (githubForwarded) {
      urls.push(githubForwarded);
    } else {
      urls.push(`${protocol}//${host}:8765`);
    }
  }

  if (
    __DEV__ &&
    (typeof window === 'undefined' || !window.location?.hostname || isLikelyLocalHost(window.location.hostname))
  ) {
    urls.push(DEFAULT_DEV_BRIDGE_URL);
  }

  return Array.from(new Set(urls));
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

  const baseUrls = buildBridgeBaseUrls();
  if (baseUrls.length === 0) {
    if (!warnedMissingBridge) {
      warnedMissingBridge = true;
      console.warn('Piper web bridge not configured. Set EXPO_PUBLIC_PIPER_WEB_BRIDGE_URL to enable local voice runtime.');
    }
    return false;
  }

  installLocalTtsBridge({
    synthesize: async payload => {
      let lastError: unknown = null;

      for (const baseUrl of baseUrls) {
        try {
          const response = await fetch(`${baseUrl}/synthesize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Piper web bridge failed (${response.status}) via ${baseUrl}: ${errorText.slice(0, 240)}`);
          }

          return response.arrayBuffer();
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error ? lastError : new Error('Piper web bridge request failed for all configured hosts');
    },
    getInfo: async () => {
      for (const baseUrl of baseUrls) {
        try {
          const response = await fetch(`${baseUrl}/info`, { method: 'GET' });
          if (!response.ok) {
            continue;
          }
          const data = (await response.json()) as { provider?: string; version?: string };
          return {
            provider: data.provider ?? 'piper-web-bridge',
            version: data.version,
          };
        } catch {
          // Try next host candidate.
        }
      }

      return { provider: 'piper-web-bridge' };
    },
  });

  return true;
};
