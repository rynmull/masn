import React, { useEffect, useState } from 'react';
import GazeVisualization from './GazeVisualization';
import { EyeTrackingManager } from '../EyeTrackingManager';

interface GazeTrackerProps {
  debug?: boolean;
  size?: number;
  color?: string;
  onGazeUpdate?: (x: number, y: number) => void;
}

const GazeTracker: React.FC<GazeTrackerProps> = ({
  debug = false,
  size = 20,
  color = '#4CAF50',
  onGazeUpdate
}) => {
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [trackingManager] = useState(() => new EyeTrackingManager());

  useEffect(() => {
    let frameId: number;
    let isTracking = false;

    const updateGaze = async () => {
      if (!isTracking) return;

      const prediction = await trackingManager.getGazePrediction();
      if (prediction) {
        const { x, y } = prediction;
        // Normalize coordinates to 0-1 range
        const normalizedX = x / window.innerWidth;
        const normalizedY = y / window.innerHeight;
        
        setPosition({ x: normalizedX, y: normalizedY });
        onGazeUpdate?.(normalizedX, normalizedY);
      }

      frameId = requestAnimationFrame(updateGaze);
    };

    const startTracking = async () => {
      if (await trackingManager.initialize()) {
        isTracking = true;
        frameId = requestAnimationFrame(updateGaze);
      }
    };

    startTracking();

    return () => {
      isTracking = false;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      trackingManager.shutdown();
    };
  }, [trackingManager, onGazeUpdate]);

  return (
    <GazeVisualization
      x={position.x}
      y={position.y}
      debug={debug}
      size={size}
      color={color}
    />
  );
};

export default GazeTracker;