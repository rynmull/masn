import React, { useEffect, useState } from 'react';
import PerformanceMonitor from '../utils/performanceMonitor';

interface PerformanceOverlayProps {
  enabled?: boolean;
}

const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({ enabled = false }) => {
  const [metrics, setMetrics] = useState({ fps: 0, frameTime: 0 });

  useEffect(() => {
    if (!enabled) return;

    const monitor = PerformanceMonitor.getInstance();
    const unsubscribe = monitor.subscribe((newMetrics) => {
      setMetrics({
        fps: newMetrics.fps,
        frameTime: Math.round(newMetrics.frameTime * 100) / 100
      });
    });

    return unsubscribe;
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '8px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
      }}
    >
      <div>FPS: {metrics.fps}</div>
      <div>Frame Time: {metrics.frameTime}ms</div>
    </div>
  );
};

export default PerformanceOverlay;