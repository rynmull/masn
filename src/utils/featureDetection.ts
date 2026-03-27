export interface BrowserFeatures {
  hasRequestAnimationFrame: boolean;
  hasCanvas2D: boolean;
  hasWebGL: boolean;
  hasPointerEvents: boolean;
  hasGetUserMedia: boolean;
}

export function detectBrowserFeatures(): BrowserFeatures {
  const features: BrowserFeatures = {
    hasRequestAnimationFrame: typeof window !== 'undefined' && 'requestAnimationFrame' in window,
    hasCanvas2D: false,
    hasWebGL: false,
    hasPointerEvents: typeof window !== 'undefined' && 'PointerEvent' in window,
    hasGetUserMedia: typeof navigator !== 'undefined' && 
      ('getUserMedia' in navigator || 
       'webkitGetUserMedia' in navigator ||
       'mozGetUserMedia' in navigator ||
       'msGetUserMedia' in navigator)
  };

  // Test Canvas2D support
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    features.hasCanvas2D = !!(canvas && canvas.getContext && canvas.getContext('2d'));
    
    // Test WebGL support
    features.hasWebGL = !!(canvas && canvas.getContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  }

  return features;
}

export function checkRequiredFeatures(): string[] {
  const features = detectBrowserFeatures();
  const missing: string[] = [];

  if (!features.hasRequestAnimationFrame) {
    missing.push('requestAnimationFrame');
  }
  if (!features.hasCanvas2D) {
    missing.push('Canvas 2D');
  }
  if (!features.hasGetUserMedia) {
    missing.push('getUserMedia');
  }

  return missing;
}

export function isBrowserSupported(): boolean {
  return checkRequiredFeatures().length === 0;
}