import { render } from '@testing-library/react-native';
import { CalibrationUI } from '../calibration/CalibrationUI';
import { EyeTrackingManager } from '../EyeTrackingManager';

const SUPPORTED_BROWSERS = ['chrome', 'firefox', 'safari', 'edge'];

describe('Eye Tracking Browser Compatibility Tests', () => {
  let manager: EyeTrackingManager;

  beforeEach(() => {
    manager = new EyeTrackingManager();
  });

  SUPPORTED_BROWSERS.forEach(browser => {
    describe(`${browser} compatibility`, () => {
      it('should initialize WebGL context', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: getMockUserAgent(browser),
          configurable: true
        });

        const { getByTestId } = render(
          <CalibrationUI eyeTrackingManager={manager} />
        );
        
        expect(getByTestId('webgl-canvas')).toBeTruthy();
      });

      it('should support requestAnimationFrame', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: getMockUserAgent(browser),
          configurable: true
        });

        let frameRequested = false;
        window.requestAnimationFrame(() => {
          frameRequested = true;
        });

        expect(frameRequested).toBe(true);
      });

      it('should support getUserMedia API', async () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: getMockUserAgent(browser),
          configurable: true
        });

        const mediaDevices = {
          getUserMedia: jest.fn().mockResolvedValue({})
        };

        Object.defineProperty(navigator, 'mediaDevices', {
          value: mediaDevices,
          configurable: true
        });

        await expect(manager.initializeCamera()).resolves.not.toThrow();
      });
    });
  });
});

function getMockUserAgent(browser: string): string {
  switch (browser) {
    case 'chrome':
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';
    case 'firefox':
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0';
    case 'safari':
      return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15';
    case 'edge':
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.66';
    default:
      return '';
  }
}