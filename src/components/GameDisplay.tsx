import { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Subscription } from 'rxjs';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';
import assetManager from '../game/assetManager';
import inputManager from '../game/inputManager';
import { GameState, gameStateService } from '../game/gameStateService';
import { eventBus, GameEvent } from '../game/eventBus';
import { createFlappySpaceRuntime } from '../game/createFlappySpaceRuntime';
import { GameRuntime } from '../game/GameRuntime';
import { getLogger } from '../utils/logger';

const logger = getLogger('GameDisplay');

export interface GameDisplayProps {
  onGameStateChange?: (state: GameState) => void;
}

const GameDisplay: React.FC<GameDisplayProps> = ({ onGameStateChange }) => {
  // Container div holding the PIXI canvas
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  
  // Store PIXI and GameRuntime references in refs
  const appRef = useRef<PIXI.Application | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const runtimeSubRef = useRef<Subscription | null>(null);
  
  // Stabilize onGameStateChange callback with a ref to avoid recreating runtime
  const onGameStateChangeRef = useRef(onGameStateChange);
  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
  }, [onGameStateChange]);

  // Track component mounted state
  const isMountedRef = useRef(true);
  
  // Component presentation state
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentState, setCurrentState] = useState<GameState>(() => gameStateService.getState());
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Check if device supports touch events
  useEffect(() => {
    const checkTouchSupport = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      logger.debug(`Touch support detected: ${hasTouch}, max touch points: ${navigator.maxTouchPoints}`);
      setIsTouchDevice(hasTouch);
    };
    
    checkTouchSupport();
  }, []);

  // Clean up function called on unmount or re-initialization
  const cleanupPixi = useCallback(() => {
    logger.debug('Cleaning up PIXI and game runtime');
    
    if (runtimeSubRef.current) {
      runtimeSubRef.current.unsubscribe();
      runtimeSubRef.current = null;
    }

    if (runtimeRef.current) {
      logger.debug('Disposing game runtime');
      runtimeRef.current.dispose();
      runtimeRef.current = null;
    }

    logger.debug('Disabling input manager');
    inputManager.disable();

    if (appRef.current) {
      logger.debug('Destroying PIXI application');
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }
  }, []);

  // Initialize game runtime after assets are loaded
  const initializeRuntime = useCallback(() => {
    logger.debug('Initializing game runtime after assets loaded', isMountedRef.current, appRef.current);
    
    setIsLoaded(true);
    setLoadError(null);
    
    try {
      const app = appRef.current;
      
      if (!app || !app.ticker) {
        logger.error('PIXI application or ticker not properly initialized');
        setLoadError('Game engine failed to initialize properly');
        return;
      }

      // Dispose existing runtime if one exists before creating fresh instance
      if (runtimeSubRef.current) {
        runtimeSubRef.current.unsubscribe();
        runtimeSubRef.current = null;
      }
      if (runtimeRef.current) {
        runtimeRef.current.dispose();
        runtimeRef.current = null;
      }
      
      logger.debug('Creating GameRuntime instance via composition root');
      const runtime = createFlappySpaceRuntime(app);
      
      logger.debug('Calling runtime.initialize()');
      runtime.initialize();
      
      logger.debug('Calling runtime.reset()');
      runtime.reset();
      
      runtimeRef.current = runtime;

      // Subscribe to runtime state changes for React presentation
      runtimeSubRef.current = runtime.state.getState$().subscribe(state => {
        if (!isMountedRef.current) return;
        setIsGameOver(state.isGameOver);
        setGameStarted(state.isStarted);
        setCurrentState(state);
        onGameStateChangeRef.current?.(state);
      });
      
      logger.debug('GameRuntime initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize game runtime:', err);
      if (isMountedRef.current) {
        setLoadError(`Failed to initialize game runtime: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, []);

  // Initialize Pixi app and attach canvas
  useEffect(() => {
    isMountedRef.current = true;

    const setupApp = async () => {
      if (!pixiContainerRef.current || appRef.current) {
        return;
      }

      try {
        logger.debug('Setting up Pixi application...');
        cleanupPixi();
        
        const app = new PIXI.Application();
        await app.init({
          background: '#1A1A1A',
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        });

        if (!isMountedRef.current) {
          app.destroy(true);
          return;
        }
        
        appRef.current = app;
        
        if (pixiContainerRef.current.firstChild) {
          pixiContainerRef.current.innerHTML = '';
        }
        
        pixiContainerRef.current.appendChild(app.canvas);
        
        // Setup responsive canvas scaling
        const handleResize = () => {
          if (!pixiContainerRef.current || !app.renderer) {
            return;
          }
          
          const container = pixiContainerRef.current;
          const width = container.clientWidth;
          const height = container.clientHeight;
          
          app.renderer.resize(width, height);
          
          const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
          app.stage.scale.set(scale);
          
          app.stage.position.x = (width - GAME_WIDTH * scale) / 2;
          app.stage.position.y = (height - GAME_HEIGHT * scale) / 2;

          if (app.canvas) {
            app.canvas.style.width = '100%';
            app.canvas.style.height = '100%';
          }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        // Load assets
        if (!assetManager.isLoaded()) {
          await assetManager.loadAssets();
        }
        
        if (!isMountedRef.current) return;
        initializeRuntime();
        
        return () => {
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
    
    setupApp();
    
    return () => {
      isMountedRef.current = false;
      cleanupPixi();
    };
  }, [cleanupPixi, initializeRuntime]);
  
  // Set up listener for asset loading completion if triggered elsewhere
  useEffect(() => {
    const assetsLoadedSubscription = eventBus.on(GameEvent.ASSETS_LOADED).subscribe(() => {
      if (!runtimeRef.current && appRef.current && isMountedRef.current) {
        initializeRuntime();
      }
    });
    
    return () => {
      assetsLoadedSubscription.unsubscribe();
    };
  }, [initializeRuntime]);

  const handleStartOrReset = () => {
    if (runtimeRef.current) {
      runtimeRef.current.systems.input.startOrResetGame();
    }
  };

  const handleGameAreaClick = () => {
    if (!runtimeRef.current) return;
    const state = runtimeRef.current.state.getState();
    if (!state.isStarted || state.isGameOver) {
      runtimeRef.current.systems.input.startOrResetGame();
    } else {
      runtimeRef.current.events.emit(GameEvent.JUMP_ACTION, null);
      runtimeRef.current.systems.entities.getAstronaut()?.flap();
    }
  };

  return (
    <div className="game-display-wrapper">
      <div 
        ref={pixiContainerRef}
        className="game-display"
        onClick={handleGameAreaClick}
        style={{ 
          cursor: gameStarted ? 'pointer' : 'default',
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />

      
      {loadError && (
        <div className="error-overlay">
          <h3>Error</h3>
          <p>{loadError}</p>
          <p className="error-tip">Check browser console for more details (F12)</p>
        </div>
      )}
      
      {!isLoaded && !loadError && (
        <div className="loading-overlay">
          <h3>Loading game assets...</h3>
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {isLoaded && (!gameStarted || isGameOver) && (
        <div 
          className="start-overlay" 
          onClick={handleStartOrReset}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStartOrReset();
          }}
        >
          <h2>{isGameOver ? 'Game Over!' : 'Flappy Spaceman'}</h2>
          {isGameOver && (
            <>
              <p>Score: {currentState.score}</p>
              <p>Orbs: {currentState.orbsCollected}/{currentState.orbsRequired}</p>
              <p>Level: {currentState.level}</p>
              {currentState.timeRemaining <= 0 && (
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
    </div>
  );
};

export default GameDisplay;