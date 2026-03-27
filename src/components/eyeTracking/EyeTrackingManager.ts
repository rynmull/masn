import webgazer from 'webgazer';

interface CalibrationPoint {
  x: number;
  y: number;
}

export class EyeTrackingManager {
  private isInitialized: boolean = false;
  private isCalibrating: boolean = false;
  private calibrationPoints: CalibrationPoint[] = [];
  
  constructor() {
    this.setupErrorHandling();
  }

  /**
   * Initialize WebGazer and set up video feed
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        console.warn('EyeTrackingManager is already initialized');
        return true;
      }

      await webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .begin();

      this.isInitialized = true;
      console.log('EyeTrackingManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize EyeTrackingManager:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Start calibration process
   */
  public async startCalibration(points: CalibrationPoint[]): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        throw new Error('EyeTrackingManager must be initialized before calibration');
      }

      if (this.isCalibrating) {
        console.warn('Calibration is already in progress');
        return false;
      }

      this.isCalibrating = true;
      this.calibrationPoints = points;
      
      // Clear existing calibration data
      await webgazer.clearData();
      
      console.log('Calibration started with', points.length, 'points');
      return true;
    } catch (error) {
      console.error('Failed to start calibration:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Add a calibration point
   */
  public async addCalibrationPoint(x: number, y: number): Promise<void> {
    try {
      if (!this.isCalibrating) {
        throw new Error('Calibration has not been started');
      }

      await webgazer.recordScreenPosition(x, y, 'click');
      console.log('Calibration point added:', { x, y });
    } catch (error) {
      console.error('Failed to add calibration point:', error);
      this.handleError(error);
    }
  }

  /**
   * End calibration process
   */
  public async endCalibration(): Promise<boolean> {
    try {
      if (!this.isCalibrating) {
        console.warn('No calibration in progress');
        return false;
      }

      this.isCalibrating = false;
      this.calibrationPoints = [];
      
      console.log('Calibration completed');
      return true;
    } catch (error) {
      console.error('Failed to end calibration:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Get current gaze prediction
   */
  public async getGazePrediction(): Promise<{ x: number; y: number } | null> {
    try {
      if (!this.isInitialized) {
        throw new Error('EyeTrackingManager must be initialized');
      }

      const prediction = await webgazer.getCurrentPrediction();
      if (!prediction) {
        return null;
      }

      return {
        x: prediction.x,
        y: prediction.y
      };
    } catch (error) {
      console.error('Failed to get gaze prediction:', error);
      this.handleError(error);
      return null;
    }
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      if (!this.isInitialized) {
        return;
      }

      await webgazer.end();
      this.isInitialized = false;
      this.isCalibrating = false;
      console.log('EyeTrackingManager shut down successfully');
    } catch (error) {
      console.error('Failed to shutdown EyeTrackingManager:', error);
      this.handleError(error);
    }
  }

  private setupErrorHandling(): void {
    // Listen for WebGazer errors
    window.addEventListener('webgazerError', (error) => {
      console.error('WebGazer error:', error);
      this.handleError(error);
    });
  }

  private handleError(error: any): void {
    // Add custom error handling logic here
    // For now, we'll just log to console, but this could be expanded to:
    // - Send errors to a monitoring service
    // - Display user-friendly error messages
    // - Attempt recovery procedures
    console.error('EyeTrackingManager error:', {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}