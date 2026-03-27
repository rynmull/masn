import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CalibrationUI } from '../calibration/CalibrationUI';

expect.extend(toHaveNoViolations);

describe('Eye Tracking Accessibility Tests', () => {
  it('should meet WCAG 2.1 contrast requirements', async () => {
    const { container } = render(<CalibrationUI />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels for interactive elements', () => {
    render(<CalibrationUI />);
    const calibrationPoints = screen.getAllByRole('button');
    
    calibrationPoints.forEach(point => {
      expect(point).toHaveAccessibleName();
      expect(point).toHaveAttribute('aria-label');
    });
  });

  it('should support keyboard navigation', () => {
    render(<CalibrationUI />);
    const calibrationPoints = screen.getAllByRole('button');
    
    calibrationPoints.forEach(point => {
      expect(point).toHaveFocus();
      expect(point).toBeVisible();
    });
  });

  it('should provide alternative text for visual indicators', () => {
    render(<CalibrationUI />);
    const visualElements = screen.getAllByRole('img');
    
    visualElements.forEach(element => {
      expect(element).toHaveAttribute('alt');
    });
  });
});