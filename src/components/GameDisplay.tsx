import { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';
import assetManager from '../game/assetManager';
import inputManager from '../game/inputManager';
import { GameState, gameStateService } from '../game/gameStateService';
import { GameController } from '../controllers/GameController';
import { eventBus, GameEvent } from '../game/eventBus';
import { inputSystem } from '../game/systems/inputSystem';
import { audioSystem } from '../game/systems/audioSystem';
import { entityManager } from '../game/systems/entityManager';
import { renderSystem } from '../game/systems/renderSystem';
import { physicsSystem } from '../game/systems/physicsSystem';
import { spawningSystem } from '../game/systems/spawningSystem';
import { uiSystem } from '../game/systems/uiSystem';
import Logger from '../utils/logger';

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
    Logger.debug('GameDisplay: Setting up game state subscription');
    const subscription = gameStateService.getState$().subscribe(state => {
      if (isMountedRef.current) {
        onGameStateChange(state);
      }
    });
    
    return () => {
      Logger.debug('GameDisplay: Cleaning up game state subscription');
      subscription.unsubscribe();
    };
  }, [onGameStateChange]);

  // Clean up function that can be called both in effects and event handlers
  const cleanupPixi = useCallback(() => {
    Logger.debug('GameDisplay: Cleaning up PIXI and game controller');
    
    // Clean up game controller
    if (gameControllerRef.current) {
      Logger.debug('GameDisplay: Disposing game controller');
      gameControllerRef.current.dispose();
      gameControllerRef.current = null;
    }

    // Clean up input manager
    Logger.debug('GameDisplay: Disabling input manager');
    inputManager.disable();

    // Clean up PIXI app
    if (appRef.current) {
      Logger.debug('GameDisplay: Destroying PIXI application');
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }
  }, []);

  // Initialize game controller and systems when assets are loaded
  const initializeGameController = useCallback(() => {
    Logger.debug('GameDisplay: Initializing game controller after assets loaded');
    
    if (!isMountedRef.current || !appRef.current) {
      Logger.debug('GameDisplay: Cannot initialize - component unmounted or app destroyed');
      return;
    }
    
    setIsLoaded(true);
    setLoadError(null);
    
    try {
      const app = appRef.current;
      
      // Ensure the app is fully initialized
      if (!app || !app.ticker) {
        Logger.error('GameDisplay: PIXI application or ticker not properly initialized');
        setLoadError('Game engine failed to initialize properly');
        return;
      }
      
      // Create the GameController with all necessary systems
      Logger.debug('GameDisplay: Creating GameController instance');
      
      // Enable event debugging to help diagnose issues
      eventBus.enableDebug();
      
      // Log PIXI app state before controller creation
      Logger.debug('GameDisplay: PIXI app state before controller creation:', 
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
      Logger.debug('GameDisplay: Calling GameController.initialize()');
      gameController.initialize();
      
      // Store controller reference
      Logger.debug('GameDisplay: Storing GameController reference');
      gameControllerRef.current = gameController;
      
      // Set up the initial game state
      Logger.debug('GameDisplay: Calling GameController.setupGame()');
      gameController.setupGame();
      
      Logger.debug('GameDisplay: Game controller initialized successfully');
    } catch (controllerError) {
      Logger.error('GameDisplay: Failed to initialize game controller:', controllerError);
      if (isMountedRef.current) {
        setLoadError(`Failed to initialize game controller: ${controllerError instanceof Error ? controllerError.message : String(controllerError)}`);
      }
    }
  }, []);

  // Initialize Pixi app
  useEffect(() => {
    const setupApp = async () => {
      // Guard against multiple initializations
      if (!pixiContainerRef.current || appRef.current) {
        Logger.debug('GameDisplay: Setup skipped - container ref missing or app already exists');
        return;
      }

      try {
        Logger.debug('GameDisplay: Setting up Pixi application...');
        
        // Clean up any existing PIXI instance
        cleanupPixi();
        
        // Create a new application with modern API
        Logger.debug('GameDisplay: Creating new PIXI Application');
        const app = new PIXI.Application();
        
        // Initialize the application
        Logger.debug('GameDisplay: Initializing PIXI Application');
        await app.init({
          background: '#1A1A1A',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });
        
        // Store app reference
        Logger.debug('GameDisplay: PIXI Application created successfully');
        appRef.current = app;
        
        // Ensure container is empty first
        if (pixiContainerRef.current.firstChild) {
          Logger.debug('GameDisplay: Clearing container');
          pixiContainerRef.current.innerHTML = '';
        }
        
        // Add the canvas to the DOM manually to avoid React's reconciliation
        Logger.debug('GameDisplay: Adding canvas to DOM');
        pixiContainerRef.current.appendChild(app.canvas);
        
        // Setup responsive behavior
        const handleResize = () => {
          if (!pixiContainerRef.current || !app.renderer) {
            Logger.debug('GameDisplay: Resize handler skipped - missing container or renderer');
            return;
          }
          
          Logger.debug('GameDisplay: Handling resize');
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
          Logger.debug(`GameDisplay: Resize complete - width: ${width}, height: ${height}, scale: ${scale}`);
        };
        
        // Initial resize
        Logger.debug('GameDisplay: Performing initial resize');
        handleResize();
        
        // Add resize listener
        Logger.debug('GameDisplay: Adding window resize listener');
        window.addEventListener('resize', handleResize);
        
        // Start loading assets asynchronously
        Logger.debug('GameDisplay: Starting asset loading process');
        if (!assetManager.isLoaded()) {
          assetManager.loadAssetsAsync();
        } else {
          // If assets are already loaded, initialize the game controller immediately
          Logger.debug('GameDisplay: Assets already loaded, initializing game controller');
          initializeGameController();
        }
        
        // Return cleanup function for resize listener
        return () => {
          Logger.debug('GameDisplay: Removing window resize listener');
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        Logger.error('GameDisplay: Error initializing Pixi application:', error);
        if (isMountedRef.current) {
          setLoadError(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
        cleanupPixi();
      }
    };
    
    Logger.debug('GameDisplay: Calling setupApp');
    setupApp();
    
    // Cleanup function
    return () => {
      Logger.debug('GameDisplay: Component unmounting, cleaning up');
      isMountedRef.current = false;
      cleanupPixi();
    };
  }, [cleanupPixi, initializeGameController]);
  
  // Set up listener for asset loading completion
  useEffect(() => {
    Logger.debug('GameDisplay: Setting up ASSETS_LOADED event listener');
    
    const assetsLoadedSubscription = eventBus.on(GameEvent.ASSETS_LOADED).subscribe((assetNames) => {
      Logger.debug('GameDisplay: ASSETS_LOADED event received', { assetNames });
      
      if (isMountedRef.current) {
        initializeGameController();
      }
    });
    
    // Also listen for asset loading errors
    const errorHandler = (error: any) => {
      Logger.error('GameDisplay: Asset loading failed:', error);
      if (isMountedRef.current) {
        setLoadError(`Failed to load game assets: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // Clean up event listeners
    return () => {
      Logger.debug('GameDisplay: Cleaning up ASSETS_LOADED event listener');
      assetsLoadedSubscription.unsubscribe();
    };
  }, [initializeGameController]);
  
  // Handle game state changes from props
  useEffect(() => {
    if (!gameControllerRef.current) {
      Logger.debug('GameDisplay: gameStarted effect skipped - no gameController');
      return;
    }
    
    Logger.debug(`GameDisplay: gameStarted prop changed to ${gameStarted}`);
    
    if (gameStarted) {
      // Use the inputSystem to handle starting the game
      inputSystem.startOrResetGame();
    }
  }, [gameStarted]);
  
  // Add global spacebar listener as a fallback for starting the game
  useEffect(() => {
    Logger.debug('GameDisplay: Setting up global spacebar listener for game start');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let inputSystem handle key presses, no need for additional processing here
      // The inputSystem is already listening for keydown events
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      Logger.debug('GameDisplay: Removing global spacebar listener');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Handle game click/tap
  const handleGameClick = useCallback(() => {
    Logger.debug('GameDisplay: Game area clicked');
    
    // Use the inputSystem to handle clicks
    inputSystem.handleGameClick();
    
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