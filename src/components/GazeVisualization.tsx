import React, { useEffect, useRef, memo } from 'react';

interface GazeVisualizationProps {
  gazePoint: { x: number; y: number };
  width: number;
  height: number;
}

const initWebGL = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    console.error('WebGL2 not supported');
    return null;
  }

  // Vertex shader for point sprites
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, `#version 300 es
    uniform vec2 uGazePoint;
    uniform vec2 uResolution;
    
    out vec2 vPosition;
    
    void main() {
      // Create a quad for point sprite
      float x = float((gl_VertexID & 1) << 1) - 1.0;
      float y = float((gl_VertexID & 2)) - 1.0;
      
      vec2 position = uGazePoint + vec2(x, y) * 20.0; // 20px radius
      
      // Convert to clip space
      vec2 clipSpace = (position / uResolution) * 2.0 - 1.0;
      clipSpace.y *= -1.0;
      
      gl_Position = vec4(clipSpace, 0, 1);
      vPosition = vec2(x, y);
    }
  `);
  gl.compileShader(vertexShader);

  // Fragment shader for smooth circle
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, `#version 300 es
    precision highp float;
    
    in vec2 vPosition;
    out vec4 fragColor;
    
    void main() {
      float dist = length(vPosition);
      float alpha = smoothstep(1.0, 0.8, dist);
      fragColor = vec4(1.0, 0.2, 0.2, alpha * 0.6); // Semi-transparent red
    }
  `);
  gl.compileShader(fragmentShader);

  // Create and link program
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Get uniform locations
  const uGazePoint = gl.getUniformLocation(program, 'uGazePoint');
  const uResolution = gl.getUniformLocation(program, 'uResolution');

  // Create empty VBO (we use gl_VertexID)
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.STATIC_DRAW);

  return {
    gl,
    program,
    uniforms: { uGazePoint, uResolution }
  };
};

const GazeVisualization: React.FC<GazeVisualizationProps> = memo(({ gazePoint, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glContextRef = useRef<any>(null);
  const rafRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);
  const TARGET_FPS = 60;
  const FRAME_TIME = 1000 / TARGET_FPS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL
    const glContext = initWebGL(canvas);
    if (!glContext) return;
    glContextRef.current = glContext;

    const { gl, program, uniforms } = glContext;

    // Set up WebGL state
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const renderFrame = (timestamp: number) => {
      const timeSinceLastRender = timestamp - lastRenderTimeRef.current;
      
      // Throttle to target FPS
      if (timeSinceLastRender >= FRAME_TIME) {
        const { gl, program, uniforms } = glContextRef.current || {};
        if (!gl || !program) return;

        // Update uniforms
        gl.uniform2f(uniforms.uGazePoint, gazePoint.x, gazePoint.y);
        gl.uniform2f(uniforms.uResolution, width, height);

        // Clear and draw
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        lastRenderTimeRef.current = timestamp;
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [gazePoint, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
});

GazeVisualization.displayName = 'GazeVisualization';

export default GazeVisualization;