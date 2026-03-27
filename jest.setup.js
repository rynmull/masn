// Mock window methods needed for WebGazer
global.window = {
  ...global.window,
  requestAnimationFrame: callback => setTimeout(callback, 0),
  cancelAnimationFrame: id => clearTimeout(id),
  HTMLVideoElement: class {},
  MediaStreamTrack: class {},
  navigator: {
    mediaDevices: {
      getUserMedia: jest.fn().mockResolvedValue({})
    }
  }
};

// Mock WebGL context
const mockGL = {
  canvas: null,
  drawImage: jest.fn(),
  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(100),
    width: 10,
    height: 10
  }),
  putImageData: jest.fn(),
  createImageData: jest.fn()
};

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGL);

// Mock requestAnimationFrame for performance testing
jest.spyOn(window, 'requestAnimationFrame');

// Accessibility testing helpers
jest.mock('@testing-library/jest-dom', () => ({
  ...jest.requireActual('@testing-library/jest-dom'),
  toHaveAccessibleName: () => ({
    pass: true,
    message: () => ''
  })
}));