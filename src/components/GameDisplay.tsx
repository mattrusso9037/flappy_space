import { useRef, useEffect } from 'react';

interface GameDisplayProps {
  gameStarted: boolean;
}

const GameDisplay = ({ gameStarted }: GameDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is where we'll initialize Pixi.js in Phase 3
    if (!containerRef.current) return;

    // For now, we'll just display a message
    const container = containerRef.current;
    container.innerHTML = '';
    
    const message = document.createElement('div');
    message.className = 'game-message';
    message.textContent = gameStarted 
      ? 'Game running! Pixi.js will be integrated in Phase 3.' 
      : 'Press Start to begin!';
    
    container.appendChild(message);

    return () => {
      // Cleanup function will be added when we integrate Pixi.js
    };
  }, [gameStarted]);

  return (
    <div 
      ref={containerRef} 
      className="game-display"
      style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#0ff',
        fontSize: '1rem',
        textAlign: 'center'
      }}
    />
  );
};

export default GameDisplay; 