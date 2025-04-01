import React from 'react';

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
  
  // Format time remaining in seconds
  const timeRemainingSeconds = Math.max(0, Math.ceil(timeRemaining / 1000));
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTimeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
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
      
      <div className="scoreboard-item">
        <span className="scoreboard-label">Orbs:</span>
        <span className="scoreboard-value">
          {orbsCollected}/{orbsRequired}
        </span>
      </div>
      
      <div className="scoreboard-item">
        <span className="scoreboard-label">Time:</span>
        <span className="scoreboard-value time-value">
          {formattedTimeRemaining}
        </span>
      </div>
    </div>
  );
};

export default Scoreboard; 