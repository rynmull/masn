import React from 'react';
import { render } from '@testing-library/react-native';
import { CalibrationUI } from '../calibration/CalibrationUI';
import { EyeTrackingManager } from '../EyeTrackingManager';

describe('Eye Tracking Performance Tests', () => {
  let frameCount = 0;
  let startTime: number;

  beforeEach(() => {
    frameCount = 0;
    startTime = performance.now();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should maintain 60fps during gaze visualization', () => {
    const { rerender } = render(<CalibrationUI />);
    
    // Simulate 1 second of frames
    for (let i = 0; i < 60; i++) {
      rerender(<CalibrationUI />);
      frameCount++;
      jest.advanceTimersByTime(16.67); // ~60fps timing
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const fps = (frameCount / duration) * 1000;

    expect(fps).toBeGreaterThanOrEqual(58); // Allow small margin for variation
    expect(fps).toBeLessThanOrEqual(62);
  });

  it('should process gaze data efficiently', () => {
    const manager = new EyeTrackingManager();
    const sampleData = { x: 100, y: 100, timestamp: Date.now() };
    
    const startProcess = performance.now();
    for (let i = 0; i < 100; i++) {
      manager.processGazeData(sampleData);
    }
    const endProcess = performance.now();
    
    expect(endProcess - startProcess).toBeLessThan(16.67); // Should process within one frame
  });
});