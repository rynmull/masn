import { useEffect, useState, RefObject } from 'react';

interface WebGLContext {
  gl: WebGL2RenderingContext | null;
  program: WebGLProgram | null;
}

export function useWebGL(
  canvasRef: RefObject<HTMLCanvasElement>,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLContext {
  const [context, setContext] = useState<WebGLContext>({ gl: null, program: null });

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize WebGL2 context
    const gl = canvasRef.current.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to create shaders');
      return;
    }

    // Compile shaders
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    // Check compilation
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
      return;
    }

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
      return;
    }

    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create program');
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking failed:', gl.getProgramInfoLog(program));
      return;
    }

    // Set up WebGL state
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Handle canvas resize
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === canvasRef.current) {
          const { width, height } = entry.contentRect;
          gl.canvas.width = width;
          gl.canvas.height = height;
        }
      }
    });

    resizeObserver.observe(canvasRef.current);

    // Update context
    setContext({ gl, program });

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [canvasRef, vertexShaderSource, fragmentShaderSource]);

  return context;
}