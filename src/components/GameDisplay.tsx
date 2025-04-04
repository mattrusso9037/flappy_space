import { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';
import assetManager from '../game/assetManager';
import inputManager from '../game/inputManager';
import { GameState, gameStateService } from '../game/gameStateService';
import { GameController } from '../controllers/GameController';
import { eventBus } from '../game/eventBus';
import { inputSystem } from '../game/systems/inputSystem';
import { audioSystem } from '../game/systems/audioSystem';
import { entityManager } from '../game/systems/entityManager';
import { renderSystem } from '../game/systems/renderSystem';
import { physicsSystem } from '../game/systems/physicsSystem';
import { spawningSystem } from '../game/systems/spawningSystem';
import { uiSystem } from '../game/systems/uiSystem';

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
  const gameControllerRef = useRef<GameController | null>(null);
  
  // Track component mounted state to prevent state updates after unmounting
  const isMountedRef = useRef(true);
  
  // Component state
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Set up state subscription
  useEffect(() => {
    console.log('GameDisplay: Setting up game state subscription');
    const subscription = gameStateService.getState$().subscribe(state => {
      if (isMountedRef.current) {
        onGameStateChange(state);
      }
    });
    
    return () => {
      console.log('GameDisplay: Cleaning up game state subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Clean up function that can be called both in effects and event handlers
  const cleanupPixi = useCallback(() => {
    console.log('GameDisplay: Cleaning up PIXI and game controller');
    
    // Clean up game controller
    if (gameControllerRef.current) {
      console.log('GameDisplay: Disposing game controller');
      gameControllerRef.current.dispose();
      gameControllerRef.current = null;
    }

    // Clean up input manager
    console.log('GameDisplay: Disabling input manager');
    inputManager.disable();

    // Clean up PIXI app
    if (appRef.current) {
      console.log('GameDisplay: Destroying PIXI application');
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }
  }, []);

  // Initialize Pixi app
  useEffect(() => {
    console.log('GameDisplay: Component mounted, initializing PIXI');
    isMountedRef.current = true;
    
    const setupApp = async () => {
      // Guard against multiple initializations
      if (!pixiContainerRef.current || appRef.current) {
        console.log('GameDisplay: Setup skipped - container ref missing or app already exists');
        return;
      }

      try {
        console.log('GameDisplay: Setting up Pixi application...');
        
        // Clean up any existing PIXI instance
        cleanupPixi();
        
        // Create a new application with modern API
        console.log('GameDisplay: Creating new PIXI Application');
        const app = new PIXI.Application();
        
        // Initialize the application
        console.log('GameDisplay: Initializing PIXI Application');
        await app.init({
          background: '#1A1A1A',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });
        
        // Store app reference
        console.log('GameDisplay: PIXI Application created successfully');
        appRef.current = app;
        
        // Ensure container is empty first
        if (pixiContainerRef.current.firstChild) {
          console.log('GameDisplay: Clearing container');
          pixiContainerRef.current.innerHTML = '';
        }
        
        // Add the canvas to the DOM manually to avoid React's reconciliation
        console.log('GameDisplay: Adding canvas to DOM');
        pixiContainerRef.current.appendChild(app.canvas);
        
        // Setup responsive behavior
        const handleResize = () => {
          if (!pixiContainerRef.current || !app.renderer) {
            console.log('GameDisplay: Resize handler skipped - missing container or renderer');
            return;
          }
          
          console.log('GameDisplay: Handling resize');
          const container = pixiContainerRef.current;
          const width = container.clientWidth;
          const height = container.clientHeight;
          
          app.renderer.resize(width, height);
          
          // Scale the stage to maintain aspect ratio but fill the container
          const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
          app.stage.scale.set(scale);
          
          // Center the game stage within the container
          app.stage.position.x = (width - GAME_WIDTH * scale) / 2;
          app.stage.position.y = (height - GAME_HEIGHT * scale) / 2;

          // Ensure the canvas fills the container
          if (app.canvas) {
            app.canvas.style.width = '100%';
            app.canvas.style.height = '100%';
          }
          console.log(`GameDisplay: Resize complete - width: ${width}, height: ${height}, scale: ${scale}`);
        };
        
        // Initial resize
        console.log('GameDisplay: Performing initial resize');
        handleResize();
        
        // Add resize listener
        console.log('GameDisplay: Adding window resize listener');
        window.addEventListener('resize', handleResize);
        
        // Load assets
        console.log('GameDisplay: Starting to load assets...');
        try {
          await assetManager.loadAssets();
          console.log('GameDisplay: Assets loaded successfully');
          
          // Guard against state updates after unmounting
          if (!isMountedRef.current) {
            console.log('GameDisplay: Component unmounted during asset loading, aborting setup');
            return;
          }
          
          setIsLoaded(true);
          setLoadError(null);
          
          // Initialize game controller and systems
          if (isMountedRef.current && appRef.current) {
            console.log('GameDisplay: Initializing game controller and systems...');
            
            const app = appRef.current;
            
            // Ensure the app is fully initialized
            if (!app || !app.ticker) {
              console.error('GameDisplay: PIXI application or ticker not properly initialized');
              setLoadError('Game engine failed to initialize properly');
              return;
            }
            
            // Create the GameController with all necessary systems
            console.log('GameDisplay: Creating GameController instance');
            
            // Enable event debugging to help diagnose issues
            eventBus.enableDebug();
            
            try {
              // Log PIXI app state before controller creation
              console.log('GameDisplay: PIXI app state before controller creation:', 
                { hasApp: !!app, hasTicker: !!(app && app.ticker) });
                
              const gameController = new GameController(
                app,
                eventBus,
                gameStateService,
                inputSystem,
                audioSystem,
                entityManager,
                renderSystem,
                physicsSystem,
                spawningSystem,
                uiSystem
              );
              
              // Initialize the controller (which will initialize all systems)
              console.log('GameDisplay: Calling GameController.initialize()');
              gameController.initialize();
              
              // Store controller reference
              console.log('GameDisplay: Storing GameController reference');
              gameControllerRef.current = gameController;
              
              // Set up the initial game state
              console.log('GameDisplay: Calling GameController.setupGame()');
              gameController.setupGame();
              
              console.log('GameDisplay: Game controller initialized successfully');
            } catch (controllerError) {
              console.error('GameDisplay: Failed to initialize game controller:', controllerError);
              if (isMountedRef.current) {
                setLoadError(`Failed to initialize game controller: ${controllerError instanceof Error ? controllerError.message : String(controllerError)}`);
              }
            }
          } else {
            console.log('GameDisplay: Cannot initialize GameController - component unmounted or app destroyed');
          }
        } catch (assetError) {
          console.error('GameDisplay: Failed to load assets:', assetError);
          if (isMountedRef.current) {
            setLoadError(`Failed to load game assets: ${assetError instanceof Error ? assetError.message : String(assetError)}`);
          }
        }
        
        // Return cleanup function for resize listener
        return () => {
          console.log('GameDisplay: Removing window resize listener');
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('GameDisplay: Error initializing Pixi application:', error);
        if (isMountedRef.current) {
          setLoadError(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
        cleanupPixi();
      }
    };
    
    console.log('GameDisplay: Calling setupApp');
    setupApp();
    
    // Cleanup function
    return () => {
      console.log('GameDisplay: Component unmounting, cleaning up');
      isMountedRef.current = false;
      cleanupPixi();
    };
  }, [cleanupPixi]);
  
  // Handle game state changes from props
  useEffect(() => {
    if (!gameControllerRef.current) {
      console.log('GameDisplay: gameStarted effect skipped - no gameController');
      return;
    }
    
    console.log(`GameDisplay: gameStarted prop changed to ${gameStarted}`);
    const gameController = gameControllerRef.current;
    const state = gameStateService.getState();
    
    if (gameStarted && !state.isStarted) {
      // If coming from game over state, we need to fully reset the game first
      if (state.isGameOver) {
        console.log('GameDisplay: Resetting game after game over');
        gameController.setupGame(); // Reset the entire game state
      }
      
      // Add a small delay before starting the game
      console.log('GameDisplay: Setting timeout to start game');
      setTimeout(() => {
        if (gameControllerRef.current && isMountedRef.current) {
          console.log('GameDisplay: Starting game via timeout');
          gameControllerRef.current.startGame();
          console.log('GameDisplay: Game started');
        }
      }, 200);
    }
  }, [gameStarted]);
  
  // Add global spacebar listener as a fallback for starting the game
  useEffect(() => {
    console.log('GameDisplay: Setting up global spacebar listener for game start');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('GameDisplay: Key pressed:', e.code);
      
      if (e.code === 'Space' && gameControllerRef.current) {
        console.log('GameDisplay: Spacebar pressed (global listener)');
        const state = gameStateService.getState();
        console.log('GameDisplay: State on spacebar press - isStarted:', state.isStarted, 'isGameOver:', state.isGameOver);
        
        // If game is over, reset everything
        if (state.isGameOver) {
          console.log('GameDisplay: Game was over - resetting game via setupGame');
          try {
            gameControllerRef.current.setupGame(); // Reset the entire game including astronaut position
            
            // Wait a short time before starting
            setTimeout(() => {
              if (gameControllerRef.current && isMountedRef.current) {
                console.log('GameDisplay: Starting game after reset');
                gameControllerRef.current.startGame();
              }
            }, 200);
          } catch (error) {
            console.error('GameDisplay: Error resetting game via spacebar:', error);
          }
        }
        // If game is not started and not in game over state, just start it
        else if (!state.isStarted) {
          console.log('GameDisplay: Starting game via global spacebar listener');
          try {
            gameControllerRef.current.startGame();
            console.log('GameDisplay: startGame called successfully via spacebar');
          } catch (error) {
            console.error('GameDisplay: Error starting game via spacebar:', error);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      console.log('GameDisplay: Removing global spacebar listener');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Handle game click/tap
  const handleGameClick = useCallback(() => {
    console.log('GameDisplay: Game area clicked');
    
    // Handle game state based on click
    if (gameControllerRef.current) {
      const state = gameStateService.getState();
      console.log('GameDisplay: Current game state - isStarted:', state.isStarted, 'isGameOver:', state.isGameOver);
      
      // If game is over, reset everything
      if (state.isGameOver) {
        console.log('GameDisplay: Game was over - resetting game via setupGame');
        try {
          gameControllerRef.current.setupGame(); // Reset the entire game including astronaut position
          
          // Wait a short time before starting
          setTimeout(() => {
            if (gameControllerRef.current && isMountedRef.current) {
              console.log('GameDisplay: Starting game after reset');
              gameControllerRef.current.startGame();
            }
          }, 200);
        } catch (error) {
          console.error('GameDisplay: Error resetting game via click:', error);
        }
      }
      // If game is not started and not in game over state, just start it
      else if (!state.isStarted) {
        console.log('GameDisplay: Starting game via click');
        try {
          gameControllerRef.current.startGame();
          console.log('GameDisplay: startGame called successfully via click');
        } catch (error) {
          console.error('GameDisplay: Error starting game via click:', error);
        }
      }
    } else {
      console.warn('GameDisplay: Game controller reference not available on click');
    }
    
    // Call the parent's click handler if provided
    if (onGameClick) onGameClick();
  }, [onGameClick]);
  
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
      {isLoaded && (!gameStarted || gameStateService.getState().isGameOver) && (
        <div className="start-overlay">
          <h2>{gameStateService.getState().isGameOver ? 'Game Over!' : 'Flappy Spaceman'}</h2>
          {gameStateService.getState().isGameOver && (
            <>
              <p>Score: {gameStateService.getState().score}</p>
              <p>Orbs: {gameStateService.getState().orbsCollected}/{gameStateService.getState().orbsRequired}</p>
              <p>Level: {gameStateService.getState().level}</p>
              {gameStateService.getState().timeRemaining <= 0 && (
                <p className="game-over-reason">Time ran out!</p>
              )}
            </>
          )}
          <p>{gameStateService.getState().isGameOver ? 'Press SPACE to try again' : 'Press SPACE to start'}</p>
          <p>Use SPACE, Up Arrow, or W to fly!</p>
          <p className="mobile-instruction">On mobile, tap anywhere to jump!</p>
          {!gameStateService.getState().isGameOver && (
            <p className="mission-goal">Collect all orbs before time runs out!</p>
          )}
        </div>
      )}
      
      {/* Display a touch overlay during gameplay on mobile/touch devices */}
      {isLoaded && gameStarted && !gameStateService.getState().isGameOver && (
        <div className="touch-overlay" onClick={handleGameClick}>
          <div className="touch-hint-container">
            <div className="touch-hint">Tap to fly!</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDisplay; 