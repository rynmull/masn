import React, { useEffect, useState } from 'react';
import styles from './CalibrationPoint.module.css';

interface CalibrationPointProps {
  x: number;
  y: number;
  onCalibrated: () => void;
}

const CalibrationPoint: React.FC<CalibrationPointProps> = ({ x, y, onCalibrated }) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [gazeTime, setGazeTime] = useState(0);
  const REQUIRED_GAZE_TIME = 1000; // 1 second of gaze required
  const ANIMATION_DURATION = 1500; // 1.5 seconds for initial animation

  useEffect(() => {
    // Initial point appearance animation
    const animationTimer = setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION);

    return () => clearTimeout(animationTimer);
  }, []);

  useEffect(() => {
    // Simulated gaze detection - replace with actual eye tracking integration
    const gazeInterval = setInterval(() => {
      if (!isAnimating) {
        setGazeTime(prev => {
          const newTime = prev + 100;
          if (newTime >= REQUIRED_GAZE_TIME) {
            clearInterval(gazeInterval);
            onCalibrated();
          }
          return newTime;
        });
      }
    }, 100);

    return () => clearInterval(gazeInterval);
  }, [isAnimating, onCalibrated]);

  const pointStyle = {
    left: `${x}%`,
    top: `${y}%`,
  };

  const progressPercent = (gazeTime / REQUIRED_GAZE_TIME) * 100;

  return (
    <div 
      className={`${styles.point} ${isAnimating ? styles.animate : ''}`}
      style={pointStyle}
    >
      <div 
        className={styles.inner}
        style={{
          transform: `scale(${progressPercent / 100})`,
        }}
      />
    </div>
  );
};

export default CalibrationPoint;