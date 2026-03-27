const mockPrediction = { x: 0, y: 0 };
let isRunning = false;

const webgazer = {
  setRegression: jest.fn().mockReturnThis(),
  setTracker: jest.fn().mockReturnThis(),
  begin: jest.fn().mockImplementation(() => {
    isRunning = true;
    return Promise.resolve();
  }),
  end: jest.fn().mockImplementation(() => {
    isRunning = false;
    return Promise.resolve();
  }),
  clearData: jest.fn().mockResolvedValue(undefined),
  recordScreenPosition: jest.fn().mockResolvedValue(undefined),
  getCurrentPrediction: jest.fn().mockImplementation(() => {
    if (!isRunning) return Promise.resolve(null);
    return Promise.resolve(mockPrediction);
  }),
  // Simulate gaze movement for testing
  setMockGaze: (x: number, y: number) => {
    mockPrediction.x = x;
    mockPrediction.y = y;
  },
  // Helper to check if webgazer is running
  isRunning: () => isRunning
};

export default webgazer;