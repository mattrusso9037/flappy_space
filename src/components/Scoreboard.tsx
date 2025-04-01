import React from 'react';

interface ScoreboardProps {
  score: number;
  level: number;
  warps: number;
  time: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ score, level, warps, time }) => {
  // Format time as seconds with one decimal place
  const formattedTime = (time / 1000).toFixed(1);
  
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
        <span className="scoreboard-label">Warps:</span>
        <span className="scoreboard-value">{warps}</span>
      </div>
      
      <div className="scoreboard-item">
        <span className="scoreboard-label">Time:</span>
        <span className="scoreboard-value">{formattedTime}s</span>
      </div>
    </div>
  );
};

export default Scoreboard; 