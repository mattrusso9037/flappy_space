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
import { GameFlow } from '../game/campaign/GameFlow';
import { GamePhase } from '../game/campaign/campaignTypes';
import { DEFAULT_CAMPAIGN } from '../game/campaign/defaultCampaign';
import { DialogueOverlay } from './story/DialogueOverlay';
import { VideoCutsceneOverlay } from './story/VideoCutsceneOverlay';
import { CutsceneRunner } from '../game/story/cutscenes/CutsceneRunner';
import { getCutscene } from '../game/story/cutscenes/cutscenes';
import { getLogger } from '../utils/logger';

const logger = getLogger('GameDisplay');

export interface GameDisplayProps {
  onGameStateChange?: (state: GameState) => void;
}

const GameDisplay: React.FC<GameDisplayProps> = ({ onGameStateChange }) => {
  // Container div holding the PIXI canvas
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  
  // Store PIXI, GameRuntime, and GameFlow references in refs
  const appRef = useRef<PIXI.Application | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const runtimeSubRef = useRef<Subscription | null>(null);
  const flowSubRef = useRef<Subscription | null>(null);
  const gameFlowRef = useRef<GameFlow | null>(null);
  const cutsceneRunnerRef = useRef<CutsceneRunner | null>(null);
  
  // Stabilize onGameStateChange callback with a ref to avoid recreating runtime
  const onGameStateChangeRef = useRef(onGameStateChange);
  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
  }, [onGameStateChange]);

  // Component presentation state
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>({ type: 'title' });
  const [canContinue, setCanContinue] = useState(false);
  const [checkpointName, setCheckpointName] = useState('Sector 01');
  const [currentState, setCurrentState] = useState<GameState>(getInitialGameState);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cutsceneDialogueId, setCutsceneDialogueId] = useState<string | null>(null);

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

  // Handle in-engine cutscene lifecycle
  useEffect(() => {
    if (gamePhase.type === 'cutscene') {
      const def = getCutscene(gamePhase.cutsceneId);
      if (!def || !runtimeRef.current) {
        logger.warn(`Cutscene "${gamePhase.cutsceneId}" could not be loaded, completing phase`);
        gameFlowRef.current?.completeStoryPhase();
        return;
      }
      const runtime = runtimeRef.current;
      const runner = new CutsceneRunner({
        onComplete: () => {
          runtime.setCutsceneRunner(null);
          runtime.systems.rendering.setFadeAlpha(0);
          runtime.systems.rendering.resetCamera();
          setCutsceneDialogueId(null);
          gameFlowRef.current?.completeStoryPhase();
        },
        onDialogueStart: (dId) => {
          setCutsceneDialogueId(dId);
        },
        onMusicChange: (musicId) => {
          runtime.systems.audio.loadMusicTrack(musicId);
          runtime.systems.audio.startMusic();
        },
        onFadeChange: (alpha) => {
          runtime.systems.rendering.setFadeAlpha(alpha);
        },
        onCameraChange: (camera) => {
          runtime.systems.rendering.setCamera(
            camera.x ?? 0,
            camera.y ?? 0,
            camera.zoom ?? 1
          );
        },
      });
      cutsceneRunnerRef.current = runner;
      runtime.setCutsceneRunner(runner);
      runner.start(def);

      return () => {
        runtime.setCutsceneRunner(null);
        runtime.systems.rendering.setFadeAlpha(0);
        runtime.systems.rendering.resetCamera();
        cutsceneRunnerRef.current = null;
        setCutsceneDialogueId(null);
      };
    }
  }, [gamePhase]);

  // Handle cutscene skip via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gamePhase.type === 'cutscene') {
        e.preventDefault();
        e.stopPropagation();
        cutsceneRunnerRef.current?.skip();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [gamePhase]);

  // Duck / pause background music during video playback
  useEffect(() => {
    if (gamePhase.type === 'video') {
      runtimeRef.current?.systems.audio.pauseMusic();
      return () => {
        runtimeRef.current?.systems.audio.resumeMusic();
      };
    }
  }, [gamePhase]);

  // Clean up function called on unmount or re-initialization
  const cleanupPixi = useCallback(() => {
    logger.debug('Cleaning up PIXI and game runtime');
    
    if (runtimeSubRef.current) {
      runtimeSubRef.current.unsubscribe();
      runtimeSubRef.current = null;
    }

    if (flowSubRef.current) {
      flowSubRef.current.unsubscribe();
      flowSubRef.current = null;
    }

    if (gameFlowRef.current) {
      gameFlowRef.current.dispose();
      gameFlowRef.current = null;
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

      // Dispose existing runtime and subscriptions if existing
      if (runtimeSubRef.current) {
        runtimeSubRef.current.unsubscribe();
        runtimeSubRef.current = null;
      }
      if (flowSubRef.current) {
        flowSubRef.current.unsubscribe();
        flowSubRef.current = null;
      }
      if (gameFlowRef.current) {
        gameFlowRef.current.dispose();
        gameFlowRef.current = null;
      }
      if (runtimeRef.current) {
        runtimeRef.current.dispose();
        runtimeRef.current = null;
      }
      
      logger.debug('Creating GameRuntime instance via composition root');
      const runtime = createFlappySpaceRuntime(app);
      runtime.initialize();
      runtime.reset();
      runtimeRef.current = runtime;

      // Instantiate GameFlow orchestrator
      const gameFlow = new GameFlow({
        campaign: DEFAULT_CAMPAIGN,
        runtime,
      });
      gameFlowRef.current = gameFlow;

      // Track whether a save checkpoint exists for Continue
      setCanContinue(gameFlow.hasSave());
      const initialProgress = gameFlow.getProgress();
      const currentLevelDef = gameFlow.campaign.levels[initialProgress.currentLevelId];
      setCheckpointName(currentLevelDef ? currentLevelDef.name : initialProgress.currentLevelId);

      // Subscribe to GameFlow phase changes
      flowSubRef.current = gameFlow.getPhase$().subscribe(phase => {
        setGamePhase(phase);
        setCanContinue(gameFlow.hasSave());
        const progress = gameFlow.getProgress();
        const def = gameFlow.campaign.levels[progress.currentLevelId];
        setCheckpointName(def ? def.name : progress.currentLevelId);
      });

      // Subscribe to runtime state changes for React presentation
      runtimeSubRef.current = runtime.state.getState$().pipe(distinctUntilChanged((a, b) =>
        a.isStarted === b.isStarted && a.isGameOver === b.isGameOver &&
        a.isLevelComplete === b.isLevelComplete && a.score === b.score &&
        a.level === b.level && a.orbsCollected === b.orbsCollected
      )).subscribe(state => {
        setCurrentState(state);
        onGameStateChangeRef.current?.(state);
      });
      
      logger.debug('GameRuntime and GameFlow initialized successfully');
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

  const handleStartOrContinue = () => {
    if (runtimeRef.current && gameFlowRef.current) {
      runtimeRef.current.systems.audio.startMusic();
      if (gamePhase.type === 'title') {
        if (canContinue) {
          gameFlowRef.current.continueGame();
        } else {
          gameFlowRef.current.startNewGame();
        }
      } else if (gamePhase.type === 'gameOver') {
        gameFlowRef.current.retryLevel();
      } else if (gamePhase.type === 'credits') {
        gameFlowRef.current.startNewGame();
      }
    }
  };

  const handleContinue = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (runtimeRef.current && gameFlowRef.current) {
      runtimeRef.current.systems.audio.startMusic();
      gameFlowRef.current.continueGame();
    }
  };

  const handleNewGame = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (runtimeRef.current && gameFlowRef.current) {
      runtimeRef.current.systems.audio.startMusic();
      gameFlowRef.current.startNewGame();
    }
  };

  const handleRetry = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (runtimeRef.current && gameFlowRef.current) {
      runtimeRef.current.systems.audio.startMusic();
      gameFlowRef.current.retryLevel();
    }
  };

  const handleGameAreaClick = () => {
    if (!runtimeRef.current || !gameFlowRef.current) return;
    const phase = gameFlowRef.current.getPhase();

    if (phase.type === 'playing') {
      runtimeRef.current.events.emit(GameEvent.JUMP_ACTION, null);
      runtimeRef.current.systems.entities.getAstronaut()?.flap();
    } else if (phase.type === 'title' || phase.type === 'gameOver' || phase.type === 'credits') {
      handleStartOrContinue();
    }
  };

  const isPlaying = gamePhase.type === 'playing';
  const isGameOver = gamePhase.type === 'gameOver';
  const isCredits = gamePhase.type === 'credits';
  const isTitle = gamePhase.type === 'title';
  const isDialogue = gamePhase.type === 'dialogue';
  const isCutscene = gamePhase.type === 'cutscene';
  const isVideo = gamePhase.type === 'video';

  const showStartOverlay = isLoaded && (isTitle || isGameOver || isCredits);

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
          cursor: isPlaying ? 'pointer' : 'default',
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

      {isDialogue && (
        <DialogueOverlay
          dialogueId={gamePhase.dialogueId}
          onComplete={() => gameFlowRef.current?.completeStoryPhase()}
        />
      )}

      {isVideo && (
        <VideoCutsceneOverlay
          videoId={gamePhase.videoId}
          isMuted={isMuted}
          onComplete={() => gameFlowRef.current?.completeStoryPhase()}
        />
      )}

      {isCutscene && (
        <>
          {cutsceneDialogueId ? (
            <DialogueOverlay
              dialogueId={cutsceneDialogueId}
              onComplete={() => cutsceneRunnerRef.current?.completeDialogue()}
            />
          ) : (
            <div className="video-hud-overlay">
              <button
                type="button"
                className="video-skip-btn"
                onClick={() => cutsceneRunnerRef.current?.skip()}
              >
                Skip Cutscene (ESC)
              </button>
            </div>
          )}
        </>
      )}

      {showStartOverlay && (
        <div 
          className="start-overlay" 
          onClick={handleStartOrContinue}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStartOrContinue();
          }}
        >
          <span className="mission-eyebrow">
            {isGameOver
              ? 'FLIGHT RECORDER / SESSION ENDED'
              : isCredits
              ? 'EXPEDITION COMPLETE / ALL SECTORS CLEARED'
              : 'ORBITAL EXPEDITION / FLIGHT READY'}
          </span>

          <h2>
            {isGameOver
              ? 'Game Over!'
              : isCredits
              ? 'Mission Accomplished!'
              : 'Flappy Spaceman'}
          </h2>

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

          {isCredits && (
            <>
              <p>Final Score: {currentState.score}</p>
              <p className="mission-goal">All campaign sectors successfully traversed!</p>
            </>
          )}

          {/* Action buttons */}
          <div className="start-overlay-actions">
            {isGameOver && (
              <button type="button" onClick={handleRetry}>
                Press SPACE to try again
              </button>
            )}

            {isCredits && (
              <button type="button" onClick={handleNewGame}>
                Start New Expedition
              </button>
            )}

            {!isGameOver && !isCredits && (
              <>
                {canContinue ? (
                  <>
                    <button type="button" onClick={handleContinue}>
                      Continue ({checkpointName})
                    </button>
                    <button type="button" className="secondary" onClick={handleNewGame}>
                      New Game
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={handleNewGame}>
                    Press SPACE to start
                  </button>
                )}
              </>
            )}
          </div>

          <p>Use SPACE, Up Arrow, or W to fly!</p>
          {isTouchDevice && (
            <p className="mobile-instruction">Tap anywhere to jump!</p>
          )}
          {!isGameOver && !isCredits && (
            <p className="mission-goal">Collect all orbs before time runs out!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameDisplay;