import React from 'react';
import { render, act } from '@testing-library/react-native';
import { CalibrationUI } from '../calibration/CalibrationUI';
import { EyeTrackingManager } from '../EyeTrackingManager';

describe('Eye Tracking Integration Tests', () => {
  let manager: EyeTrackingManager;

  beforeEach(() => {
    manager = new EyeTrackingManager();
  });

  it('should properly integrate with EyeTrackingManager', () => {
    const { getByTestId } = render(
      <CalibrationUI eyeTrackingManager={manager} />
    );
    
    expect(getByTestId('calibration-container')).toBeTruthy();
  });

  it('should handle gaze data updates', async () => {
    const { getByTestId } = render(
      <CalibrationUI eyeTrackingManager={manager} />
    );

    await act(async () => {
      manager.updateGazePosition({ x: 100, y: 100 });
    });

    const overlay = getByTestId('gaze-overlay');
    expect(overlay).toHaveStyle({ transform: [{ translateX: 100 }, { translateY: 100 }] });
  });

  it('should maintain calibration state', async () => {
    const { getByTestId } = render(
      <CalibrationUI eyeTrackingManager={manager} />
    );

    await act(async () => {
      manager.startCalibration();
      manager.addCalibrationPoint({ x: 0, y: 0 });
      manager.addCalibrationPoint({ x: 100, y: 100 });
    });

    expect(manager.isCalibrated()).toBe(true);
  });

  it('should handle error conditions gracefully', async () => {
    const { getByTestId } = render(
      <CalibrationUI eyeTrackingManager={manager} />
    );

    await act(async () => {
      manager.handleError(new Error('Test error'));
    });

    expect(getByTestId('error-message')).toHaveTextContent('Test error');
  });
});