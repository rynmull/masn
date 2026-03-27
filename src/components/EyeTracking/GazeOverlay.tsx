import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { EyeTrackingManager } from '../../services/EyeTrackingManager';

interface GazeOverlayProps {
  manager: EyeTrackingManager;
  showDebug?: boolean;
  opacity?: number;
}

export const GazeOverlay: React.FC<GazeOverlayProps> = ({
  manager,
  showDebug = false,
  opacity = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const prediction = manager.getCurrentGazePrediction();
      if (prediction) {
        const { x, y, confidence } = prediction;
        
        // Draw gaze point
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(66, 135, 245, ${opacity * confidence})`;
        ctx.fill();
        
        // Draw confidence ring
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(66, 135, 245, ${opacity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Debug information
        if (showDebug) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.font = '12px monospace';
          ctx.fillText(`X: ${x.toFixed(1)} Y: ${y.toFixed(1)}`, x + 25, y);
          ctx.fillText(`Confidence: ${(confidence * 100).toFixed(1)}%`, x + 25, y + 15);
        }
      }
      
      frameRef.current = requestAnimationFrame(render);
    };
    
    frameRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [manager, showDebug, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={styles.overlay}
      aria-label="Eye gaze tracking visualization"
      role="img"
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 9999,
  },
});