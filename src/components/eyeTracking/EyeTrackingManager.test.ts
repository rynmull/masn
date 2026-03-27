import { EyeTrackingManager } from './EyeTrackingManager';
import webgazer from 'webgazer';

// Mock webgazer
jest.mock('webgazer', () => ({
  setRegression: jest.fn().mockReturnThis(),
  setTracker: jest.fn().mockReturnThis(),
  begin: jest.fn().mockResolvedValue(undefined),
  clearData: jest.fn().mockResolvedValue(undefined),
  recordScreenPosition: jest.fn().mockResolvedValue(undefined),
  getCurrentPrediction: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
}));

describe('EyeTrackingManager', () => {
  let manager: EyeTrackingManager;

  beforeEach(() => {
    manager = new EyeTrackingManager();
    // Clear all mock calls between tests
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await manager.initialize();
      expect(result).toBe(true);
      expect(webgazer.setRegression).toHaveBeenCalledWith('ridge');
      expect(webgazer.setTracker).toHaveBeenCalledWith('TFFacemesh');
      expect(webgazer.begin).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      (webgazer.begin as jest.Mock).mockRejectedValueOnce(error);
      
      const result = await manager.initialize();
      expect(result).toBe(false);
    });
  });

  describe('calibration', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should start calibration successfully', async () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      const result = await manager.startCalibration(points);
      expect(result).toBe(true);
      expect(webgazer.clearData).toHaveBeenCalled();
    });

    it('should add calibration points', async () => {
      await manager.startCalibration([{ x: 0, y: 0 }]);
      await manager.addCalibrationPoint(50, 50);
      expect(webgazer.recordScreenPosition).toHaveBeenCalledWith(50, 50, 'click');
    });

    it('should end calibration successfully', async () => {
      await manager.startCalibration([{ x: 0, y: 0 }]);
      const result = await manager.endCalibration();
      expect(result).toBe(true);
    });
  });

  describe('gaze prediction', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get gaze prediction successfully', async () => {
      const mockPrediction = { x: 100, y: 200 };
      (webgazer.getCurrentPrediction as jest.Mock).mockResolvedValueOnce(mockPrediction);
      
      const result = await manager.getGazePrediction();
      expect(result).toEqual(mockPrediction);
    });

    it('should handle null predictions', async () => {
      (webgazer.getCurrentPrediction as jest.Mock).mockResolvedValueOnce(null);
      
      const result = await manager.getGazePrediction();
      expect(result).toBeNull();
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await manager.initialize();
      await manager.shutdown();
      expect(webgazer.end).toHaveBeenCalled();
    });
  });
});