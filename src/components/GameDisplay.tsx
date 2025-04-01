import { useRef, useEffect, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const resizeListenerRef = useRef<(() => void) | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize Pixi app
  useEffect(() => {
    const setupApp = async () => {
      if (containerRef.current && !appRef.current) {
        try {
          console.log('Setting up Pixi application...');
          
          // Create a new application with modern API
          const app = new PIXI.Application();
          
          // Initialize the application
          await app.init({
            background: '#000033', // Changed to match game background
            antialias: true,
            resolution: window.devicePixelRatio || 1,
          });
          
          // Store the app reference
          appRef.current = app;
          
          // Clear the container and add the canvas
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(app.canvas);
          
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
          
          // Store resize listener for cleanup
          resizeListenerRef.current = resizeCanvas;
          
          // Initial resize
          resizeCanvas();
          
          // Add window resize listener
          window.addEventListener('resize', resizeCanvas);
          
          // Load assets using our asset manager
          console.log('Starting to load assets...');
          try {
            await assetManager.loadAssets();
            console.log('Assets loaded successfully');
            setIsLoaded(true);
            setLoadError(null);
          } catch (assetError) {
            console.error('Failed to load assets:', assetError);
            setLoadError(`Failed to load game assets: ${assetError instanceof Error ? assetError.message : String(assetError)}`);
          }
          
        } catch (error) {
          console.error('Error initializing Pixi application:', error);
          setLoadError(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    
    setupApp();
    
    // Cleanup function
    return () => {
      // Remove resize listener
      if (resizeListenerRef.current) {
        window.removeEventListener('resize', resizeListenerRef.current);
        resizeListenerRef.current = null;
      }
      
      // Clean up game manager
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
      }
      
      // Destroy Pixi app
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
      
      // Clean up input manager
      inputManager.disable();
      
      // Clear game manager reference
      gameManagerRef.current = null;
    };
  }, []);
  
  // Initialize game manager once assets are loaded
  useEffect(() => {
    if (!appRef.current || !isLoaded) return;
    
    try {
      console.log('Initializing game manager...');
      // Initialize game manager if it doesn't exist
      if (!gameManagerRef.current) {
        gameManagerRef.current = new GameManager(appRef.current, (state: GameState) => {
          onGameStateChange(state);
        });
        
        // Setup initial game state
        gameManagerRef.current.setupGame();
        console.log('Game manager initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing game manager:', error);
      setLoadError(`Error setting up game: ${error instanceof Error ? error.message : String(error)}`);
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
    >
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
    </div>
  );
};

export default GameDisplay; 