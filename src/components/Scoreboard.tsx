import React, { useState, useEffect, useRef } from 'react';

interface ScoreboardProps {
  score: number;
  level: number;
  warps: number;
  time: number;
  orbsCollected: number;
  orbsRequired: number;
  timeRemaining: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ 
  score, 
  level, 
  warps, 
  time, 
  orbsCollected, 
  orbsRequired,
  timeRemaining 
}) => {
  // Format time as seconds with one decimal place
  const formattedTime = (time / 1000).toFixed(1);
  
  // Track previous values to detect changes
  const prevOrbsRef = useRef(orbsCollected);
  const prevTimeRef = useRef(timeRemaining);
  
  // States for animation
  const [orbPulse, setOrbPulse] = useState(false);
  const [timePulse, setTimePulse] = useState(false);
  
  // Format time remaining in seconds
  const timeRemainingSeconds = Math.max(0, Math.ceil(timeRemaining / 1000));
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTimeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate percentage of orbs collected
  const orbPercentage = Math.min(100, Math.floor((orbsCollected / orbsRequired) * 100));
  
  // Determine color based on time remaining
  const getTimeColor = () => {
    if (timeRemaining <= 10000) return '#FF0000'; // Red when <= 10 seconds
    if (timeRemaining <= 30000) return '#FFAA00'; // Orange when <= 30 seconds
    return '#00FF00'; // Green otherwise
  };
  
  // Detect changes in orbs and time to trigger animations
  useEffect(() => {
    // Check if orbs count changed
    if (orbsCollected !== prevOrbsRef.current) {
      setOrbPulse(true);
      setTimeout(() => setOrbPulse(false), 300);
      prevOrbsRef.current = orbsCollected;
    }
    
    // Check if time changed significantly (every 5 seconds)
    const prevTimeInSeconds = Math.floor(prevTimeRef.current / 1000);
    const currentTimeInSeconds = Math.floor(timeRemaining / 1000);
    
    if (Math.abs(prevTimeInSeconds - currentTimeInSeconds) >= 5 || 
        (timeRemaining <= 10000 && prevTimeRef.current > 10000) ||
        (timeRemaining <= 30000 && prevTimeRef.current > 30000)) {
      setTimePulse(true);
      setTimeout(() => setTimePulse(false), 300);
      prevTimeRef.current = timeRemaining;
    }
  }, [orbsCollected, timeRemaining]);
  
  return (
    <div className="scoreboard">
      <div className="scoreboard-item">
        <span className="scoreboard-label">Score:</span>
        <span className="scoreboard-value">{score}</span>
      </div>
      
      <div className="scoreboard-item">
        <span className="scoreboard-label">Level:</span>
        <span className="scoreboard-value">{level}</span>
      </div>
      
      <div className={`scoreboard-item ${orbPulse ? 'pulse' : ''}`}>
        <span className="scoreboard-label">Orbs:</span>
        <span className="scoreboard-value orbs-value">
          {orbsCollected}/{orbsRequired}
        </span>
      </div>
      
      <div className={`scoreboard-item ${timePulse ? 'pulse' : ''}`}>
        <span className="scoreboard-label">Time:</span>
        <span 
          className="scoreboard-value time-value" 
          style={{ 
            color: getTimeColor(),
            animation: timeRemaining <= 10000 ? 'pulse-critical 0.8s infinite' : 'none'
          }}
        >
          {formattedTimeRemaining}
        </span>
      </div>
      
      {/* Progress bar for orbs */}
      <div className="progress-container">
        <div className="progress-label">Orbs Progress</div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${orbPercentage}%`,
              backgroundColor: orbPercentage >= 100 ? '#00FF00' : '#66AAFF',
              transition: orbPulse ? 'width 0.3s ease-out, background-color 0.3s' : 'width 0.5s ease-out'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Scoreboard; 