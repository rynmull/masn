export type CalibrationStatus = 'ready' | 'calibrating' | 'complete' | 'failed';

export interface CalibrationPoint {
  x: number;
  y: number;
}

export interface CalibrationState {
  status: CalibrationStatus;
  currentPoint: number;
  points: CalibrationPoint[];
  feedback: string;
}