import React from 'react';
import { render, act } from '@testing-library/react-native';
import { GazeOverlay } from '../GazeOverlay';
import { EyeTrackingManager } from '../../../services/EyeTrackingManager';

// Mock the EyeTrackingManager
jest.mock('../../../services/EyeTrackingManager');

describe('GazeOverlay', () => {
  let mockManager: jest.Mocked<EyeTrackingManager>;
  
  beforeEach(() => {
    mockManager = {
      getCurrentGazePrediction: jest.fn(),
    } as unknown as jest.Mocked<EyeTrackingManager>;
    
    // Mock window methods
    global.requestAnimationFrame = jest.fn();
    global.cancelAnimationFrame = jest.fn();
    
    // Mock canvas context
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
    };
    
    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
  });

  it('renders without crashing', () => {
    const { getByRole } = render(
      <GazeOverlay manager={mockManager} />
    );
    
    expect(getByRole('img')).toBeTruthy();
  });

  it('updates canvas size on window resize', () => {
    render(<GazeOverlay manager={mockManager} />);
    
    act(() => {
      global.innerWidth = 1024;
      global.innerHeight = 768;
      global.dispatchEvent(new Event('resize'));
    });
    
    const canvas = document.querySelector('canvas');
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);
  });

  it('renders gaze prediction when available', () => {
    mockManager.getCurrentGazePrediction.mockReturnValue({
      x: 100,
      y: 200,
      confidence: 0.8,
    });

    render(<GazeOverlay manager={mockManager} showDebug={true} />);
    
    const context = document.querySelector('canvas')?.getContext('2d');
    expect(context?.beginPath).toHaveBeenCalled();
    expect(context?.arc).toHaveBeenCalledWith(100, 200, expect.any(Number), 0, Math.PI * 2);
  });

  it('shows debug information when enabled', () => {
    mockManager.getCurrentGazePrediction.mockReturnValue({
      x: 100,
      y: 200,
      confidence: 0.8,
    });

    render(<GazeOverlay manager={mockManager} showDebug={true} />);
    
    const context = document.querySelector('canvas')?.getContext('2d');
    expect(context?.fillText).toHaveBeenCalled();
  });

  it('cleans up animation frame on unmount', () => {
    const { unmount } = render(<GazeOverlay manager={mockManager} />);
    unmount();
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });
});