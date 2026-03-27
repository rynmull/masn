interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  frames: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    frames: 0
  };
  private lastTime: number = 0;
  private frameCount: number = 0;
  private updateInterval: number = 1000; // Update stats every second
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = [];

  private constructor() {
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private tick(timestamp: number): void {
    // Calculate frame time
    const frameTime = this.lastTime ? timestamp - this.lastTime : 0;
    this.lastTime = timestamp;
    this.frameCount++;

    // Update metrics every second
    if (timestamp - (this.metrics.frames * this.updateInterval) >= this.updateInterval) {
      this.metrics = {
        fps: this.frameCount,
        frameTime: frameTime,
        frames: Math.floor(timestamp / this.updateInterval)
      };
      this.frameCount = 0;

      // Notify subscribers
      this.callbacks.forEach(callback => callback(this.metrics));
    }

    requestAnimationFrame(this.tick);
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

export default PerformanceMonitor;