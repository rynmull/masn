export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 0;
  private frameTime: number = 0;
  private lastFPSUpdate: number = 0;
  private fpsUpdateInterval: number = 500; // Update FPS every 500ms

  constructor() {
    this.lastFPSUpdate = performance.now();
  }

  beginFrame(): void {
    this.lastFrameTime = performance.now();
  }

  endFrame(): void {
    const now = performance.now();
    this.frameTime = now - this.lastFrameTime;
    this.frameCount++;

    // Update FPS calculation every 500ms
    if (now - this.lastFPSUpdate >= this.fpsUpdateInterval) {
      this.fps = (this.frameCount * 1000) / (now - this.lastFPSUpdate);
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }
  }

  getFPS(): number {
    return Math.round(this.fps);
  }

  getFrameTime(): number {
    return Math.round(this.frameTime * 100) / 100;
  }

  dispose(): void {
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fps = 0;
    this.frameTime = 0;
  }
}