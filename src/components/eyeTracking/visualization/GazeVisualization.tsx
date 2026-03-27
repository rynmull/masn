import React, { useEffect, useRef, useCallback, memo } from 'react';
import { useWebGL } from './useWebGL';
import { shaders } from './shaders';
import { PerformanceMonitor } from './PerformanceMonitor';
import styles from './GazeVisualization.module.css';

interface GazeVisualizationProps {
  x: number;
  y: number;
  debug?: boolean;
  size?: number;
  color?: string;
}

const GazeVisualization: React.FC<GazeVisualizationProps> = memo(({
  x,
  y,
  debug = false,
  size = 20,
  color = '#4CAF50'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gl, program } = useWebGL(canvasRef, shaders.vertex, shaders.fragment);
  const frameRef = useRef<number>();
  const perfMonitor = useRef<PerformanceMonitor>();

  // Initialize performance monitoring
  useEffect(() => {
    if (debug && !perfMonitor.current) {
      perfMonitor.current = new PerformanceMonitor();
    }
    return () => {
      if (perfMonitor.current) {
        perfMonitor.current.dispose();
      }
    };
  }, [debug]);

  // Render gaze indicator
  const render = useCallback(() => {
    if (!gl || !program || !canvasRef.current) return;

    // Start frame timing
    perfMonitor.current?.beginFrame();

    // Clear and set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update uniforms
    const positionLoc = gl.getUniformLocation(program, 'u_position');
    const sizeLoc = gl.getUniformLocation(program, 'u_size');
    const colorLoc = gl.getUniformLocation(program, 'u_color');

    // Convert color string to RGB
    const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || [76, 175, 80];

    gl.uniform2f(positionLoc, x, y);
    gl.uniform1f(sizeLoc, size);
    gl.uniform3f(colorLoc, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

    // Draw point sprite
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // End frame timing
    perfMonitor.current?.endFrame();

    // Schedule next frame
    frameRef.current = requestAnimationFrame(render);
  }, [gl, program, x, y, size, color]);

  // Setup render loop
  useEffect(() => {
    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [render]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Gaze tracking visualization"
        role="img"
      />
      {debug && (
        <div className={styles.debug}>
          FPS: {perfMonitor.current?.getFPS() || 0}
          <br />
          Frame Time: {perfMonitor.current?.getFrameTime() || 0}ms
        </div>
      )}
    </>
  );
});

GazeVisualization.displayName = 'GazeVisualization';

export default GazeVisualization;