import React from 'react';
import { render, screen } from '@testing-library/react';
import { GazeOverlay } from '../GazeOverlay';
import { EyeTrackingManager } from '../../../services/EyeTrackingManager';

// Mock EyeTrackingManager
jest.mock('../../../services/EyeTrackingManager');

describe('GazeOverlay', () => {
  let mockManager: jest.Mocked<EyeTrackingManager>;

  beforeEach(() => {
    mockManager = new EyeTrackingManager() as jest.Mocked<EyeTrackingManager>;
    mockManager.getCurrentGazePrediction = jest.fn().mockReturnValue({
      x: 100,
      y: 100,
      confidence: 0.8
    });
    mockManager.isCalibrated = jest.fn().mockReturnValue(true);
  });

  it('renders with proper ARIA attributes', () => {
    render(<GazeOverlay manager={mockManager} />);
    
    const canvas = screen.getByTestId('gaze-overlay');
    expect(canvas).toHaveAttribute('role', 'img');
    expect(canvas).toHaveAttribute('aria-label', 'Eye gaze tracking visualization');
    expect(canvas).toHaveAttribute('aria-description');
  });

  it('announces eye tracking status', () => {
    render(<GazeOverlay manager={mockManager} />);
    
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Eye tracking active');
  });

  it('announces uncalibrated state', () => {
    mockManager.isCalibrated.mockReturnValue(false);
    render(<GazeOverlay manager={mockManager} />);
    
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Eye tracking not calibrated');
  });

  it('applies high contrast styles when enabled', () => {
    render(<GazeOverlay manager={mockManager} highContrast={true} />);
    
    // We can't test the canvas rendering directly, but we can verify the prop is accepted
    const canvas = screen.getByTestId('gaze-overlay');
    expect(canvas).toBeInTheDocument();
  });

  // Error handling test
  it('handles errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockManager.getCurrentGazePrediction.mockImplementation(() => {
      throw new Error('Test error');
    });

    render(<GazeOverlay manager={mockManager} />);
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getByTestId('gaze-overlay')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});