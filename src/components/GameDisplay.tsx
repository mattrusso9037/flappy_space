import { useRef, useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';
import { GameManager, GameState } from '../game/gameState';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';

interface GameDisplayProps {
  gameStarted: boolean;
  onGameClick?: () => void;
  onGameStateChange: (state: GameState) => void;
}

const GameDisplay = ({ gameStarted, onGameClick, onGameStateChange }: GameDisplayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize Pixi app
  useEffect(() => {
    if (!containerRef.current) return;

    // Create Pixi Application if it doesn't exist
    if (!appRef.current) {
      const app = new PIXI.Application({
        background: '#000000',
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });
      
      appRef.current = app;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(app.view as HTMLCanvasElement);
      
      // Make canvas responsive
      const resizeCanvas = () => {
        if (!containerRef.current || !app.renderer) return;
        
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        app.renderer.resize(width, height);
        
        // Scale the stage to maintain aspect ratio
        const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
        app.stage.scale.set(scale);
        
        // Center the stage
        app.stage.position.x = (width - GAME_WIDTH * scale) / 2;
        app.stage.position.y = (height - GAME_HEIGHT * scale) / 2;
      };
      
      // Initial resize
      resizeCanvas();
      
      // Add window resize listener
      window.addEventListener('resize', resizeCanvas);
      
      // Load assets
      PIXI.Assets.load('/assets/astro-sprite.png').then(texture => {
        setIsLoaded(true);
      });
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        app.destroy(true, true);
        appRef.current = null;
        gameManagerRef.current = null;
      };
    }
  }, []);
  
  // Initialize game manager once assets are loaded
  useEffect(() => {
    if (!appRef.current || !isLoaded) return;
    
    // Initialize game manager if it doesn't exist
    if (!gameManagerRef.current) {
      gameManagerRef.current = new GameManager(appRef.current, (state: GameState) => {
        onGameStateChange(state);
      });
      
      // Setup initial game state
      gameManagerRef.current.setupGame();
    }
  }, [isLoaded, onGameStateChange]);
  
  // Handle game state changes from props
  useEffect(() => {
    if (!gameManagerRef.current) return;
    
    const gameManager = gameManagerRef.current;
    
    if (gameStarted && !gameManager.state.isStarted && !gameManager.state.isGameOver) {
      gameManager.startGame();
    } else if (!gameStarted && gameManager.state.isStarted) {
      gameManager.gameOver();
    }
  }, [gameStarted]);
  
  // Handle flap/boost from outside
  const handleGameClick = () => {
    if (gameManagerRef.current && gameStarted) {
      gameManagerRef.current.flap();
      if (onGameClick) onGameClick();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="game-display"
      style={{ cursor: gameStarted ? 'pointer' : 'default' }}
      onClick={handleGameClick}
    />
  );
};

export default GameDisplay; 