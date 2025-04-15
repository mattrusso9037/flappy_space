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
import { entityManager } from '../game/systems/entitySystem';
import { renderSystem } from '../game/systems/renderSystem';
import { physicsSystem } from '../game/systems/physicsSystem';
import { spawningSystem } from '../game/systems/spawningSystem';
import { uiSystem } from '../game/systems/uiSystem';
import { getLogger } from '../utils/logger';

const logger = getLogger('GameDisplay');

interface GameDisplayProps {

}

const GameDisplay = ({ }: GameDisplayProps) => {
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
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  // Track whether we're on a touch device
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Check if the device supports touch events
  useEffect(() => {
    const checkTouchSupport = () => {
      const hasTouchPoints = navigator.maxTouchPoints > 0;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      logger.debug(`Touch support detected: ${hasTouch}, max touch points: ${navigator.maxTouchPoints}`);
      setIsTouchDevice(hasTouch);
    };
    
    checkTouchSupport();
  }, []);

  // Set up state subscription
  useEffect(() => {
    logger.debug('Setting up game state subscription');
    const subscription = gameStateService.getState$().subscribe(state => {
      // if (isMountedRef.current) {
        // onGameStateChange(state);
        setIsGameOver(state.isGameOver);
        setGameStarted(state.isStarted);
      // }
    });
    
    return () => {
      logger.debug('Cleaning up game state subscription');
      subscription.unsubscribe();
    };
  }, []);


  // Clean up function that can be called both in effects and event handlers
  const cleanupPixi = useCallback(() => {
    logger.debug('Cleaning up PIXI and game controller');
    
    // Clean up game controller
    if (gameControllerRef.current) {
      logger.debug('Disposing game controller');
      gameControllerRef.current.dispose();
      gameControllerRef.current = null;
    }

    // Clean up input manager
    logger.debug('Disabling input manager');
    inputManager.disable();

    // Clean up PIXI app
    if (appRef.current) {
      logger.debug('Destroying PIXI application');
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }
  }, []);

  // Initialize game controller and systems when assets are loaded
  const initializeGameController = useCallback(() => {
    logger.debug('Initializing game controller after assets loaded', isMountedRef.current, appRef.current);
    
    
    setIsLoaded(true);
    logger.debug('Setting isLoaded to true');
    setLoadError(null);
    
    try {
      const app = appRef.current;
      
      // Ensure the app is fully initialized
      if (!app || !app.ticker) {
        logger.error('PIXI application or ticker not properly initialized');
        setLoadError('Game engine failed to initialize properly');
        return;
      }
      
      // Create the GameController with all necessary systems
      logger.debug('Creating GameController instance');
      
      // Enable event debugging to help diagnose issues
      eventBus.enableDebug();
      
      // Log PIXI app state before controller creation
      logger.debug('PIXI app state before controller creation:', 
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
      logger.debug('Calling GameController.initialize()');
      gameController.initialize();
      
      // Store controller reference
      logger.debug('Storing GameController reference');
      gameControllerRef.current = gameController;
      
      // Set up the initial game state
      logger.debug('Calling GameController.setupGame()');
      gameController.setupGame();
      
      logger.debug('Game controller initialized successfully');
    } catch (controllerError) {
      logger.error('Failed to initialize game controller:', controllerError);
      if (isMountedRef.current) {
        setLoadError(`Failed to initialize game controller: ${controllerError instanceof Error ? controllerError.message : String(controllerError)}`);
      }
    }
  }, [gameControllerRef, gameControllerRef, isMountedRef, appRef]);

  // Initialize Pixi app
  useEffect(() => {
    const setupApp = async () => {
      // Guard against multiple initializations
      if (!pixiContainerRef.current || appRef.current) {
        logger.debug('Setup skipped - container ref missing or app already exists');
        return;
      }

      try {
        logger.debug('Setting up Pixi application...');
        
        // Clean up any existing PIXI instance
        cleanupPixi();
        
        // Create a new application with modern API
        logger.debug('Creating new PIXI Application');
        const app = new PIXI.Application();
        
        // Initialize the application
        logger.debug('Initializing PIXI Application');
        await app.init({
          background: '#1A1A1A',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });
        
        // Store app reference
        logger.debug('PIXI Application created successfully');
        appRef.current = app;
        
        // Ensure container is empty first
        if (pixiContainerRef.current.firstChild) {
          logger.debug('Clearing container');
          pixiContainerRef.current.innerHTML = '';
        }
        
        // Add the canvas to the DOM manually to avoid React's reconciliation
        logger.debug('Adding canvas to DOM');
        pixiContainerRef.current.appendChild(app.canvas);
        
        // Setup responsive behavior
        const handleResize = () => {
          if (!pixiContainerRef.current || !app.renderer) {
            logger.debug('Resize handler skipped - missing container or renderer');
            return;
          }
          
          logger.debug('Handling resize');
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
          logger.debug(`Resize complete - width: ${width}, height: ${height}, scale: ${scale}`);
        };
        
        // Initial resize
        logger.debug('Performing initial resize');
        handleResize();
        
        // Add resize listener
        logger.debug('Adding window resize listener');
        window.addEventListener('resize', handleResize);
        
        // Start loading assets asynchronously
        logger.debug('Starting asset loading process');
        if (!assetManager.isLoaded()) {
          await assetManager.loadAssetsAsync();
        } else {
          // If assets are already loaded, initialize the game controller immediately
          logger.debug('Assets already loaded, initializing game controller');
          initializeGameController();
        }
        
        // Return cleanup function for resize listener
        return () => {
          logger.debug('Removing window resize listener');
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        logger.error('Error initializing Pixi application:', error);
        if (isMountedRef.current) {
          setLoadError(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        }
        cleanupPixi();
      }
        };
    
    logger.debug('Calling setupApp');
    setupApp();
    
    // Cleanup function
    return () => {
      logger.debug('Component unmounting, cleaning up');
      isMountedRef.current = false;
      cleanupPixi();
    };
  }, [cleanupPixi, initializeGameController]);
  
  // Set up listener for asset loading completion
  useEffect(() => {
    logger.debug('Setting up ASSETS_LOADED event listener');
    
    const assetsLoadedSubscription = eventBus.on(GameEvent.ASSETS_LOADED).subscribe((assetNames) => {
      logger.debug('ASSETS_LOADED event received', { assetNames }, isMountedRef.current);
      
      // if (isMountedRef.current) {
        initializeGameController();
      // }
    });
    
    // Clean up event listeners
    return () => {
      logger.debug('Cleaning up ASSETS_LOADED event listener');
      assetsLoadedSubscription.unsubscribe();
    };
  }, [initializeGameController, isMountedRef.current]);
  
  
  
  // Handle direct touch events
  
  logger.debug('GameDisplay rendered', isLoaded, isGameOver, gameStarted);

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
        // onClick={handleGameClick}
        // onTouchStart={handleTouch}
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
      {isLoaded && (!gameStarted || isGameOver) && (
        <div 
          className="start-overlay" 
          onClick={() => inputSystem.startOrResetGame()}
          onTouchStart={(e) => {
            e.preventDefault();
            inputSystem.startOrResetGame();
          }}
        >
          <h2>{isGameOver ? 'Game Over!' : 'Flappy Spaceman'}</h2>
          {isGameOver && (
            <>
              <p>Score: {gameStateService.getState().score}</p>
              <p>Orbs: {gameStateService.getState().orbsCollected}/{gameStateService.getState().orbsRequired}</p>
              <p>Level: {gameStateService.getState().level}</p>
              {gameStateService.getState().timeRemaining <= 0 && (
                <p className="game-over-reason">Time ran out!</p>
              )}
            </>
          )}
          <p>{isGameOver ? 'Press SPACE to try again' : 'Press SPACE to start'}</p>
          <p>Use SPACE, Up Arrow, or W to fly!</p>
          {isTouchDevice && (
            <p className="mobile-instruction">Tap anywhere to jump!</p>
          )}
          {!isGameOver && (
            <p className="mission-goal">Collect all orbs before time runs out!</p>
          )}
        </div>
      )}
      
      {/* Display a touch overlay during gameplay on mobile/touch devices */}
      {/* {isLoaded && gameStarted && !isGameOver && isTouchDevice && (
        <div 
          className="touch-overlay" 
          // onClick={handleGameClick}
          // onTouchStart={handleTouch}
        >
          <div className="touch-hint-container">
            <div className="touch-hint">Tap to fly!</div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default GameDisplay; 