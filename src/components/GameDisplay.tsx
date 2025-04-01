import { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GameManager, GameState } from '../game/gameState';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';
import assetManager from '../game/assetManager';
import inputManager from '../game/inputManager';

interface GameDisplayProps {
  gameStarted: boolean;
  onGameClick?: () => void;
  onGameStateChange: (state: GameState) => void;
}

const GameDisplay = ({ gameStarted, onGameClick, onGameStateChange }: GameDisplayProps) => {
  // Use a dedicated ref for the container div that will hold the canvas
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  
  // Store PIXI and game references in refs
  const appRef = useRef<PIXI.Application | null>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  
  // Track component mounted state to prevent state updates after unmounting
  const isMountedRef = useRef(true);
  
  // Component state
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orbsCollected, setOrbsCollected] = useState(0);
  const [orbsRequired, setOrbsRequired] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(60000);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Track the last update time to detect stalls
  const lastUpdateRef = useRef(Date.now());
  
  // Update component state based on game state
  const handleGameStateUpdate = useCallback((state: GameState) => {
    if (!isMountedRef.current) return;
    
    // Log update time to detect issues
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    console.log(`Component update after ${timeSinceLastUpdate}ms`);
    lastUpdateRef.current = now;
    
    // Update local state
    setOrbsCollected(state.orbsCollected);
    setOrbsRequired(state.orbsRequired);
    setTimeRemaining(state.timeRemaining);
    setScore(state.score);
    setLevel(state.level);
    
    // Pass to parent
    onGameStateChange(state);
  }, [onGameStateChange]);

  // Clean up function that can be called both in effects and event handlers
  const cleanupPixi = useCallback(() => {
    // Clean up game manager
    if (gameManagerRef.current) {
      gameManagerRef.current.dispose();
      gameManagerRef.current = null;
    }

    // Clean up input manager
    inputManager.disable();

    // Clean up PIXI app
    if (appRef.current) {
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }
  }, []);

  // Initialize Pixi app
  useEffect(() => {
    isMountedRef.current = true;
    
    const setupApp = async () => {
      // Guard against multiple initializations
      if (!pixiContainerRef.current || appRef.current) return;

      try {
        console.log('Setting up Pixi application...');
        
        // Clean up any existing PIXI instance
        cleanupPixi();
        
        // Create a new application with modern API
        const app = new PIXI.Application();
        
        // Initialize the application
        await app.init({
          background: '#1A1A1A',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });
        
        // Store app reference
        appRef.current = app;
        
        // Ensure container is empty first
        if (pixiContainerRef.current.firstChild) {
          pixiContainerRef.current.innerHTML = '';
        }
        
        // Add the canvas to the DOM manually to avoid React's reconciliation
        pixiContainerRef.current.appendChild(app.canvas);
        
        // Setup responsive behavior
        const handleResize = () => {
          if (!pixiContainerRef.current || !app.renderer) return;
          
          const container = pixiContainerRef.current;
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
        handleResize();
        
        // Add resize listener
        window.addEventListener('resize', handleResize);
        
        // Load assets
        console.log('Starting to load assets...');
        try {
          await assetManager.loadAssets();
          console.log('Assets loaded successfully');
          
          // Guard against state updates after unmounting
          if (isMountedRef.current) {
            setIsLoaded(true);
            setLoadError(null);
          }
          
          // Initialize game manager
          if (isMountedRef.current && appRef.current) {
            console.log('Initializing game manager...');
            const gameManager = new GameManager(appRef.current, (state: GameState) => {
              if (isMountedRef.current) {
                handleGameStateUpdate(state);
              }
            });
            
            gameManagerRef.current = gameManager;
            gameManager.setupGame();
            console.log('Game manager initialized successfully');
          }
        } catch (assetError) {
          console.error('Failed to load assets:', assetError);
          if (isMountedRef.current) {
            setLoadError(`Failed to load game assets: ${assetError instanceof Error ? assetError.message : String(assetError)}`);
          }
        }
        
        // Return cleanup function for resize listener
        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('Error initializing Pixi application:', error);
        if (isMountedRef.current) {
          setLoadError(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
        cleanupPixi();
      }
    };
    
    setupApp();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      cleanupPixi();
    };
  }, [cleanupPixi, handleGameStateUpdate]);
  
  // Handle game state changes from props
  useEffect(() => {
    if (!gameManagerRef.current) return;
    
    const gameManager = gameManagerRef.current;
    
    if (gameStarted && !gameManager.state.isStarted && !gameManager.state.isGameOver) {
      // Add a small delay before starting the game
      setTimeout(() => {
        if (gameManagerRef.current && isMountedRef.current) {
          gameManagerRef.current.startGame();
          console.log('Game started');
        }
      }, 200);
    } else if (!gameStarted && gameManager.state.isStarted) {
      gameManager.gameOver();
    }
  }, [gameStarted]);
  
  // Handle game click/tap
  const handleGameClick = useCallback(() => {
    if (gameManagerRef.current && gameStarted && gameManagerRef.current.state.isStarted) {
      gameManagerRef.current.flap();
      console.log('Flap');
      if (onGameClick) onGameClick();
    }
  }, [gameStarted, onGameClick]);
  
  return (
    <div className="game-display-wrapper">
      {/* This div will hold the PIXI canvas */}
      <div 
        ref={pixiContainerRef}
        className="game-display"
        style={{ 
          cursor: gameStarted ? 'pointer' : 'default',
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
        onClick={handleGameClick}
      />
      
      {/* In-game HUD overlay */}
      {isLoaded && gameStarted && !loadError && (
        <div className="game-hud">
          <div className="hud-item hud-time">
            <span>TIME: </span>
            <span style={{ 
              color: timeRemaining <= 10000 ? '#FF0000' : 
                     timeRemaining <= 30000 ? '#FFAA00' : '#00FF00' 
            }}>
              {Math.ceil(timeRemaining/1000)}s
            </span>
          </div>
          <div className="hud-item hud-orbs">
            <span>ORBS: </span>
            <span>{orbsCollected}/{orbsRequired}</span>
          </div>
        </div>
      )}
      
      {/* Show loading error if there is one */}
      {loadError && (
        <div className="error-overlay">
          <h3>Error</h3>
          <p>{loadError}</p>
          <p className="error-tip">Check browser console for more details (F12)</p>
        </div>
      )}
      
      {/* Show loading indicator */}
      {!isLoaded && !loadError && (
        <div className="loading-overlay">
          <h3>Loading game assets...</h3>
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {/* Show game start or game over messages */}
      {(isLoaded && !gameStarted && !loadError) && (
        <div className="start-overlay">
          <h2>{gameManagerRef.current?.state.isGameOver ? 'Game Over!' : 'Flappy Spaceman'}</h2>
          {gameManagerRef.current?.state.isGameOver && (
            <>
              <p>Score: {score}</p>
              <p>Orbs: {orbsCollected}/{orbsRequired}</p>
              <p>Level: {level}</p>
              {timeRemaining <= 0 && (
                <p className="game-over-reason">Time ran out!</p>
              )}
            </>
          )}
          <p>{gameManagerRef.current?.state.isGameOver ? 'Click START to try again' : 'Click START to play'}</p>
          <p>Press Space, Up Arrow, or W to fly!</p>
          {!gameManagerRef.current?.state.isGameOver && (
            <p className="mission-goal">Collect all orbs before time runs out!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameDisplay; 