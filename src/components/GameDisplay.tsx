import { useRef, useEffect } from 'react';

interface GameDisplayProps {
  gameStarted: boolean;
  onGameClick?: () => void;
}

const GameDisplay = ({ gameStarted, onGameClick }: GameDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This will be where we initialize Pixi.js in Phase 3
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    
    // Create a placeholder message
    const message = document.createElement('div');
    message.className = 'game-message';
    message.textContent = gameStarted 
      ? 'Game running! Click/tap to boost. Pixi.js will be integrated in Phase 3.' 
      : 'Press Start to begin!';
    
    container.appendChild(message);

    // Setup container for clicks
    const handleClick = () => {
      if (gameStarted && onGameClick) {
        onGameClick();
      }
    };

    container.addEventListener('click', handleClick);
    
    return () => {
      // Cleanup
      container.removeEventListener('click', handleClick);
    };
  }, [gameStarted, onGameClick]);

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
        textAlign: 'center',
        cursor: gameStarted ? 'pointer' : 'default'
      }}
    />
  );
};

export default GameDisplay; 