import React, { useState, useCallback } from 'react';
import GazeVisualization from './GazeVisualization';
import PerformanceOverlay from './PerformanceOverlay';

interface GazeTrackerProps {
  debug?: boolean;
}

const GazeTracker: React.FC<GazeTrackerProps> = ({ debug = false }) => {
  const [gazePoint, setGazePoint] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // In real usage, replace this with actual gaze tracking data
    setGazePoint({
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  return (
    <div
      style={{ width: '100vw', height: '100vh' }}
      onMouseMove={handleMouseMove}
    >
      <GazeVisualization
        gazePoint={gazePoint}
        width={window.innerWidth}
        height={window.innerHeight}
      />
      <PerformanceOverlay enabled={debug} />
    </div>
  );
};

export default GazeTracker;