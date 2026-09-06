import { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Subscription, distinctUntilChanged } from 'rxjs';
import '../styles/GameDisplay.css';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';
import assetManager from '../game/assetManager';
import { GameState, getInitialGameState } from '../game/gameStateService';
import { GameEvent } from '../game/eventBus';
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

  // Component presentation state
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentState, setCurrentState] = useState<GameState>(getInitialGameState);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Check if device supports touch events
  useEffect(() => {
    const checkTouchSupport = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      logger.debug(`Touch support detected: ${hasTouch}, max touch points: ${navigator.maxTouchPoints}`);
      setIsTouchDevice(hasTouch);
    };
    
    checkTouchSupport();
  }, []);

  // Listen for 'M' shortcut to toggle audio mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
        if (runtimeRef.current) {
          const muted = runtimeRef.current.systems.audio.toggleMute();
          setIsMuted(muted);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

    if (appRef.current) {
      logger.debug('Destroying PIXI application');
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
    }
  }, []);

  // Initialize game runtime after assets are loaded
  const initializeRuntime = useCallback(() => {
    logger.debug('Initializing game runtime after assets loaded', appRef.current);
    
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
      runtimeSubRef.current = runtime.state.getState$().pipe(distinctUntilChanged((a, b) =>
        a.isStarted === b.isStarted && a.isGameOver === b.isGameOver &&
        a.isLevelComplete === b.isLevelComplete && a.score === b.score &&
        a.level === b.level && a.orbsCollected === b.orbsCollected
      )).subscribe(state => {
        setIsGameOver(state.isGameOver);
        setGameStarted(state.isStarted);
        setCurrentState(state);
        onGameStateChangeRef.current?.(state);
      });
      
      logger.debug('GameRuntime initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize game runtime:', err);
      setLoadError(`Failed to initialize game runtime: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  // Initialize Pixi app and attach canvas
  useEffect(() => {
    let isCancelled = false;
    let removeResizeListener: (() => void) | null = null;

    const setupApp = async () => {
      if (!pixiContainerRef.current || appRef.current) {
        return;
      }

      try {
        logger.debug('Setting up Pixi application...');
        cleanupPixi();
        
        const app = new PIXI.Application();
        await app.init({
          background: '#070913',
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });

        if (isCancelled) {
          app.destroy(true);
          return;
        }
        
        appRef.current = app;
        
        if (pixiContainerRef.current) {
          pixiContainerRef.current.innerHTML = '';
          pixiContainerRef.current.appendChild(app.canvas);
        }
        
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
        removeResizeListener = () => {
          window.removeEventListener('resize', handleResize);
        };
        
        // Load assets
        if (!assetManager.isLoaded()) {
          await assetManager.loadAssets();
        }
        
        if (isCancelled) return;
        // Bundle fonts locally and load before Pixi rasterizes telemetry.
        if (document.fonts) await Promise.all([
          document.fonts.load('400 16px "Space Mono"'),
          document.fonts.load('700 32px "Space Grotesk"'),
        ]);
        if (!isCancelled) initializeRuntime();
      } catch (error) {
        if (isCancelled) return;
        logger.error('Error initializing Pixi application:', error);
        setLoadError(`Error initializing game: ${error instanceof Error ? error.message : String(error)}`);
        cleanupPixi();
      }
    };
    
    setupApp();
    
    return () => {
      isCancelled = true;
      if (removeResizeListener) {
        removeResizeListener();
      }
      cleanupPixi();
    };
  }, [cleanupPixi, initializeRuntime]);


  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (runtimeRef.current) {
      const muted = runtimeRef.current.systems.audio.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleStartOrReset = () => {
    if (runtimeRef.current) {
      runtimeRef.current.systems.audio.startMusic();
      runtimeRef.current.systems.input.startOrResetGame();
    }
  };

  const handleGameAreaClick = () => {
    if (!runtimeRef.current) return;
    const state = runtimeRef.current.state.getState();
    if (!state.isStarted || state.isGameOver) {
      runtimeRef.current.systems.audio.startMusic();
      runtimeRef.current.systems.input.startOrResetGame();
    } else {
      runtimeRef.current.events.emit(GameEvent.JUMP_ACTION, null);
      runtimeRef.current.systems.entities.getAstronaut()?.flap();
    }
  };

  return (
    <div className="game-display-wrapper">
      {isLoaded && (
        <button
          type="button"
          className={`audio-toggle-btn ${isMuted ? 'muted' : ''}`}
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
          <span className="audio-toggle-label">{isMuted ? 'MUTED' : 'AUDIO'}</span>
        </button>
      )}

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
          <span className="mission-eyebrow">{isGameOver ? 'FLIGHT RECORDER / SESSION ENDED' : 'ORBITAL EXPEDITION / FLIGHT READY'}</span>
          <h2>{isGameOver ? (currentState.isLevelComplete ? 'Mission complete!' : 'Game Over!') : 'Flappy Spaceman'}</h2>
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
          <button type="button" onClick={e => { e.stopPropagation(); handleStartOrReset(); }}>{isGameOver ? 'Press SPACE to try again' : 'Press SPACE to start'}</button>
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