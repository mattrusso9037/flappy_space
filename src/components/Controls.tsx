import React from 'react';

interface ControlsProps {
  gameStarted: boolean;
  onFlap: () => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({ gameStarted, onFlap, onReset }) => {
  return (
    <div className="controls">
      <button 
        onClick={gameStarted ? onFlap : onReset} 
        className={gameStarted ? 'boost-button' : 'start-button'}
      >
        {gameStarted ? 'Boost' : 'Start Game'}
      </button>
      
      {gameStarted && (
        <button onClick={onReset} className="retry-button">
          Retry
        </button>
      )}
    </div>
  );
};

export default Controls; 