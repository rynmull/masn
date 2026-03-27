import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { EyeTrackingManager } from '../../services/EyeTrackingManager';

interface GazeOverlayProps {
  manager: EyeTrackingManager;
  showDebug?: boolean;
  opacity?: number;
  highContrast?: boolean;
}

interface ScreenSection {
  name: string;
  x: [number, number];
  y: [number, number];
}

const SCREEN_SECTIONS: ScreenSection[] = [
  { name: 'top left', x: [0, 0.33], y: [0, 0.33] },
  { name: 'top center', x: [0.33, 0.66], y: [0, 0.33] },
  { name: 'top right', x: [0.66, 1], y: [0, 0.33] },
  { name: 'middle left', x: [0, 0.33], y: [0.33, 0.66] },
  { name: 'center', x: [0.33, 0.66], y: [0.33, 0.66] },
  { name: 'middle right', x: [0.66, 1], y: [0.33, 0.66] },
  { name: 'bottom left', x: [0, 0.33], y: [0.66, 1] },
  { name: 'bottom center', x: [0.33, 0.66], y: [0.66, 1] },
  { name: 'bottom right', x: [0.66, 1], y: [0.66, 1] },
];

export const GazeOverlay: React.FC<GazeOverlayProps> = ({
  manager,
  showDebug = false,
  opacity = 0.5,
  highContrast = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const [lastAnnounced, setLastAnnounced] = useState<string>('');
  const lastAnnouncedTimeRef = useRef<number>(0);

  const getScreenSection = (x: number, y: number, width: number, height: number): string => {
    const relX = x / width;
    const relY = y / height;
    
    for (const section of SCREEN_SECTIONS) {
      if (relX >= section.x[0] && relX < section.x[1] &&
          relY >= section.y[0] && relY < section.y[1]) {
        return section.name;
      }
    }
    return 'unknown';
  };

  const announceGazePosition = (x: number, y: number, width: number, height: number) => {
    const now = Date.now();
    const section = getScreenSection(x, y, width, height);
    
    // Only announce changes and limit frequency to every 1 second
    if (section !== lastAnnounced && now - lastAnnouncedTimeRef.current > 1000) {
      const announcement = `Gaze position: ${section}`;
      // Create and dispatch announcement
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('class', 'sr-only');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      
      // Clean up after announcement
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 1000);

      setLastAnnounced(section);
      lastAnnouncedTimeRef.current = now;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Feature detection
    if (!window.requestAnimationFrame) {
      console.error('Browser does not support requestAnimationFrame');
      return;
    }

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
      
      try {
        const prediction = manager.getCurrentGazePrediction();
        if (prediction) {
          const { x, y, confidence } = prediction;
          
          // Draw gaze point
          ctx.beginPath();
          ctx.arc(x, y, highContrast ? 15 : 10, 0, Math.PI * 2);
          ctx.fillStyle = highContrast 
            ? `rgba(255, 255, 0, ${opacity * confidence})` // High contrast yellow
            : `rgba(66, 135, 245, ${opacity * confidence})`; // Default blue
          ctx.fill();
          
          // Draw confidence ring
          ctx.beginPath();
          ctx.arc(x, y, highContrast ? 25 : 20, 0, Math.PI * 2);
          ctx.strokeStyle = highContrast
            ? `rgba(0, 0, 0, ${opacity})` // High contrast black
            : `rgba(66, 135, 245, ${opacity * 0.5})`; // Default blue
          ctx.lineWidth = highContrast ? 3 : 2;
          ctx.stroke();
          
          // Debug information
          if (showDebug) {
            ctx.fillStyle = highContrast ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.8)';
            ctx.font = highContrast ? 'bold 14px monospace' : '12px monospace';
            ctx.fillText(`X: ${x.toFixed(1)} Y: ${y.toFixed(1)}`, x + 25, y);
            ctx.fillText(`Confidence: ${(confidence * 100).toFixed(1)}%`, x + 25, y + 15);
          }

          // Announce position for screen readers
          announceGazePosition(x, y, canvas.width, canvas.height);
        }
      } catch (error) {
        console.error('Error in gaze rendering:', error);
        // Don't break the animation loop on error
      }
      
      frameRef.current = requestAnimationFrame(render);
    };
    
    frameRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [manager, showDebug, opacity, highContrast]);

  return (
    <>
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        Eye tracking {manager.isCalibrated() ? 'active' : 'not calibrated'}
      </div>
      <canvas
        ref={canvasRef}
        style={styles.overlay}
        role="img"
        aria-label="Eye gaze tracking visualization"
        aria-description="Visual overlay showing current eye gaze position with confidence indicators"
        data-testid="gaze-overlay"
      />
    </>
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