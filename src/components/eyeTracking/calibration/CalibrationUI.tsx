import React, { useState, useEffect } from 'react';
import CalibrationPoint from './CalibrationPoint';
import { CalibrationStatus } from './types';
import styles from './CalibrationUI.module.css';

interface CalibrationUIProps {
  onCalibrationComplete: (success: boolean) => void;
}

const CalibrationUI: React.FC<CalibrationUIProps> = ({ onCalibrationComplete }) => {
  const [currentPoint, setCurrentPoint] = useState<number>(0);
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus>('ready');
  const [feedback, setFeedback] = useState<string>('');

  // Define calibration points (5-point calibration)
  const calibrationPoints = [
    { x: 10, y: 10 },   // Top-left
    { x: 90, y: 10 },   // Top-right
    { x: 50, y: 50 },   // Center
    { x: 10, y: 90 },   // Bottom-left
    { x: 90, y: 90 },   // Bottom-right
  ];

  useEffect(() => {
    if (currentPoint >= calibrationPoints.length) {
      setCalibrationStatus('complete');
      onCalibrationComplete(true);
    }
  }, [currentPoint]);

  const handlePointCalibrated = () => {
    setFeedback('Point calibrated successfully!');
    setTimeout(() => {
      setCurrentPoint(prev => prev + 1);
      setFeedback('');
    }, 1000);
  };

  const startCalibration = () => {
    setCalibrationStatus('calibrating');
    setCurrentPoint(0);
    setFeedback('Please follow the points with your eyes');
  };

  if (calibrationStatus === 'ready') {
    return (
      <div className={styles.container}>
        <h2>Eye Tracking Calibration</h2>
        <p>We need to calibrate the eye tracker for accurate control.</p>
        <button onClick={startCalibration} className={styles.startButton}>
          Start Calibration
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {calibrationStatus === 'calibrating' && currentPoint < calibrationPoints.length && (
        <>
          <div className={styles.feedback}>{feedback}</div>
          <div className={styles.calibrationArea}>
            <CalibrationPoint
              x={calibrationPoints[currentPoint].x}
              y={calibrationPoints[currentPoint].y}
              onCalibrated={handlePointCalibrated}
            />
          </div>
          <div className={styles.progress}>
            Point {currentPoint + 1} of {calibrationPoints.length}
          </div>
        </>
      )}
    </div>
  );
};

export default CalibrationUI;