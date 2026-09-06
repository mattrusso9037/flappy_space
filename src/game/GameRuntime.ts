import * as PIXI from 'pixi.js';
import { Subscription } from 'rxjs';
import { EventBus, GameEvent } from './eventBus';
import { GameStateService } from './gameStateService';
import { EntitySystem } from './systems/entitySystem';
import { PhysicsSystem } from './systems/physicsSystem';
import { SpawningSystem } from './systems/spawningSystem';
import { RenderSystem } from './systems/renderSystem';
import { InputSystem } from './systems/inputSystem';
import { AudioSystem } from './systems/audioSystem';
import { UISystem } from './systems/uiSystem';
import { MOTION } from './visuals/tokens';
import { LevelDefinition } from './campaign/campaignTypes';
import { DEFAULT_CAMPAIGN } from './campaign/defaultCampaign';
import { CutsceneRunner } from './story/cutscenes/CutsceneRunner';
import { getLogger } from '../utils/logger';

const logger = getLogger('GameRuntime');

export interface GameRuntimeSystems {
  entities: EntitySystem;
  physics: PhysicsSystem;
  spawning: SpawningSystem;
  rendering: RenderSystem;
  input: InputSystem;
  audio: AudioSystem;
  ui: UISystem;
}

export interface GameRuntimeOptions {
  app: PIXI.Application;
  events: EventBus;
  state: GameStateService;
  systems: GameRuntimeSystems;
  levelDefinition?: LevelDefinition;
}

/**
 * GameRuntime owns the game session lifecycle, systems, event bus, state,
 * and game loop ticker for a single mounted game instance.
 */
export class GameRuntime {
  public readonly app: PIXI.Application;
  public readonly events: EventBus;
  public readonly state: GameStateService;
  public readonly systems: GameRuntimeSystems;

  private currentLevelDefinition: LevelDefinition;
  private initialized: boolean = false;
  private disposed: boolean = false;
  private isPaused: boolean = false;
  private levelTransitionCountdown: number | null = null;
  private cutsceneRunner: CutsceneRunner | null = null;
  private subscriptions: Subscription[] = [];
  private onTickBound: (ticker: PIXI.Ticker) => void;

  public constructor(options: GameRuntimeOptions) {
    this.app = options.app;
    this.events = options.events;
    this.state = options.state;
    this.systems = options.systems;
    this.currentLevelDefinition = options.levelDefinition || DEFAULT_CAMPAIGN.levels[DEFAULT_CAMPAIGN.startingLevelId];
    this.onTickBound = this.onTick.bind(this);
    logger.info('GameRuntime instantiated');
  }

  /**
   * Initialize all systems and event subscriptions.
   */
  public initialize(): void {
    if (this.initialized) {
      logger.warn('GameRuntime already initialized');
      return;
    }

    logger.info('Initializing GameRuntime and systems...');

    // Initialize systems in proper order
    this.systems.input.initialize();
    this.systems.audio.initialize();
    // RenderSystem must initialize before entities so worldCamera container exists.
    this.systems.rendering.initialize(this.app);
    // Pass worldCamera so entity layers are inside the camera-transformed container.
    this.systems.entities.initialize(this.app, this.systems.rendering.worldCamera);
    this.systems.physics.initialize();
    this.systems.spawning.initialize();
    this.systems.ui.initialize(this.app);

    // Wire runtime-level event subscriptions
    this.setupRuntimeSubscriptions();

    // Attach tick callback to PIXI ticker
    if (this.app.ticker) {
      this.app.ticker.remove(this.onTickBound);
      this.app.ticker.add(this.onTickBound);
      if (!this.app.ticker.started) {
        this.app.ticker.start();
      }
    }

    this.initialized = true;
    this.disposed = false;
    logger.info('GameRuntime initialization complete');
  }

  /**
   * Reset the game session to initial playable state.
   */
  public reset(levelDefinition?: LevelDefinition): void {
    logger.info('Resetting GameRuntime session...');
    this.levelTransitionCountdown = null;
    this.cutsceneRunner = null;
    this.systems.ui.reset();
    this.systems.rendering.reset(); // also calls resetCamera()
    this.systems.entities.clearAll();
    this.systems.spawning.resetSpawning();
    this.state.resetGame();

    const defToLoad = levelDefinition || this.currentLevelDefinition;
    this.loadLevel(defToLoad);

    this.isPaused = false;
    this.events.emit(GameEvent.SHOW_START_PROMPT, null);
    logger.info('GameRuntime reset complete');
  }

  /**
   * Load and initialize an explicit LevelDefinition.
   */
  public loadLevel(levelDefinition: LevelDefinition): void {
    this.currentLevelDefinition = levelDefinition;
    logger.info(`GameRuntime: Loading level ${levelDefinition.id} (${levelDefinition.name})`);

    this.state.loadLevel({
      level: levelDefinition.gameplay.levelNumber ?? 1,
      levelId: levelDefinition.id,
      levelName: levelDefinition.name,
      orbsRequired: levelDefinition.gameplay.orbsRequired,
      timeLimit: levelDefinition.gameplay.timeLimit,
    });

    this.systems.spawning.setLevelConfig({
      speeds: levelDefinition.gameplay.speeds,
      spawnInterval: levelDefinition.gameplay.spawnInterval,
      obstacles: levelDefinition.gameplay.obstacles,
      ground: levelDefinition.gameplay.ground,
      orbs: levelDefinition.gameplay.orbs,
      levelNumber: levelDefinition.gameplay.levelNumber,
    });

    if (levelDefinition.presentation) {
      if (levelDefinition.presentation.environmentId) {
        this.systems.rendering.applyEnvironment(levelDefinition.presentation.environmentId);
      }
      if (levelDefinition.presentation.musicId) {
        this.systems.audio.loadMusicTrack(levelDefinition.presentation.musicId);
      }
    }

    this.systems.physics.setScrollSpeed(levelDefinition.gameplay.speeds.planet);
    this.systems.rendering.setScrollSpeed(levelDefinition.gameplay.speeds.planet);
    this.systems.entities.clearAll();
    this.systems.spawning.resetSpawning();
    this.systems.entities.setGround(levelDefinition.gameplay.ground, levelDefinition.presentation.terrainId);
    this.systems.entities.setMovementConfig(levelDefinition.gameplay.movement);
    this.systems.entities.createAstronaut();
    this.systems.rendering.createBackground();
  }

  /**
   * Initialize configuration and entities for a specific level index or LevelDefinition.
   */
  public initializeLevel(levelOrDef: number | LevelDefinition): void {
    if (typeof levelOrDef === 'number') {
      const sectorKey = `sector-${String(levelOrDef).padStart(2, '0')}`;
      const def = DEFAULT_CAMPAIGN.levels[sectorKey] || DEFAULT_CAMPAIGN.levels[DEFAULT_CAMPAIGN.startingLevelId];
      this.loadLevel(def);
    } else {
      this.loadLevel(levelOrDef);
    }
  }

  public getLevelDefinition(): LevelDefinition {
    return this.currentLevelDefinition;
  }

  public setCutsceneRunner(runner: CutsceneRunner | null): void {
    this.cutsceneRunner = runner;
    this.systems.ui.setPresentationVisible(!runner);
    // Story presentation uses the runtime clock while the cutscene branch gates gameplay.
    if (runner) this.isPaused = false;
    if (!runner) this.systems.rendering.setCinematicScene(null);
  }

  public getCutsceneRunner(): CutsceneRunner | null {
    return this.cutsceneRunner;
  }

  /**
   * Start gameplay.
   */
  public start(): void {
    const currentState = this.state.getState();
    if (currentState.isStarted && !currentState.isGameOver) {
      logger.info('Game already started');
      return;
    }

    logger.info('Starting game via GameRuntime...');
    this.state.startGame();
    this.events.emit(GameEvent.HIDE_START_PROMPT, null);

    if (this.app.ticker && !this.app.ticker.started) {
      this.app.ticker.start();
    }
  }

  /**
   * Pause the game session.
   */
  public pause(): void {
    if (this.isPaused || (!this.state.getState().isStarted && !this.cutsceneRunner?.isActive())) return;
    this.isPaused = true;
    logger.info('GameRuntime paused');
  }

  /**
   * Resume the game session.
   */
  public resume(): void {
    if (!this.isPaused || this.state.getState().isGameOver) return;
    this.isPaused = false;
    logger.info('GameRuntime resumed');
  }

  /**
   * Main game loop tick handler.
   */
  public onTick(ticker: PIXI.Ticker): void {
    if (!this.initialized || this.disposed) return;

    // Convert deltaMS to normalized deltaSeconds
    const deltaSeconds = ticker.deltaMS / 1000;

    // Pause gates every visual clock, including ambient motion and existing bursts.
    if (this.isPaused) return;

    // If cutscene runner is active, update in simulation time
    if (this.cutsceneRunner && this.cutsceneRunner.isActive()) {
      this.cutsceneRunner.update(deltaSeconds);
      try {
        this.systems.rendering.updateBackground(deltaSeconds);
      } catch (err) {
        logger.error('Error updating background in render system', err);
      }
      this.systems.rendering.update(deltaSeconds);
      return;
    }

    this.systems.ui.update(deltaSeconds);

    // 1. Update background/stars regardless of game active state
    try {
      this.systems.rendering.updateBackground(deltaSeconds);
    } catch (err) {
      logger.error('Error updating background in render system', err);
    }

    // Skip simulation updates if paused, not started, or game over
    const gameState = this.state.getState();
    if (!gameState.isStarted || gameState.isGameOver) {
      this.systems.rendering.update(deltaSeconds);
      return;
    }

    // If waiting for level transition, count down simulation time
    if (this.levelTransitionCountdown !== null) {
      this.levelTransitionCountdown -= deltaSeconds;
      if (this.levelTransitionCountdown <= 0) {
        this.levelTransitionCountdown = null;
        if (!this.disposed) {
          const completedLevelId = this.currentLevelDefinition.id;
          const score = this.state.getState().score;
          logger.info(`Level warp finished for ${completedLevelId}, emitting LEVEL_COMPLETED`);
          this.events.emit(GameEvent.LEVEL_COMPLETED, {
            levelId: completedLevelId,
            score,
          });
        }
      }
      return;
    }

    // 2. Decrement remaining level time
    const updatedState = this.state.updateTime(ticker.deltaMS);
    this.events.emit(GameEvent.TIME_UPDATED, {
      time: updatedState.time,
      timeRemaining: updatedState.timeRemaining,
      timeRanOut: updatedState.timeRemaining <= 0,
    });

    // 2.5 Process continuous player input
    try {
      this.systems.input.update(deltaSeconds);
    } catch (err) {
      logger.error('Error updating input system', err);
    }

    // 3. Update physics (movement, boundaries, collisions)
    try {
      this.systems.physics.update(deltaSeconds, this.systems.entities.getAllEntities());
    } catch (err) {
      logger.error('Error updating physics system', err);
    }

    // 4. Update spawning (obstacles, orbs)
    try {
      this.systems.spawning.update(deltaSeconds, this.state.getState());
    } catch (err) {
      logger.error('Error updating spawning system', err);
    }

    // 5. Update render positions of dynamic entities
    try {
      this.systems.rendering.update(deltaSeconds, this.systems.entities.getAllEntities());
    } catch (err) {
      logger.error('Error updating render system', err);
    }

    // 6. Update UI (scoreboards, particle bursts)
    try {
      this.systems.ui.update(0);
    } catch (err) {
      logger.error('Error updating UI system', err);
    }
  }

  /**
   * Tear down all systems, remove ticker listeners, and clean up subscriptions.
   */
  public dispose(): void {
    if (this.disposed) return;

    logger.info('Disposing GameRuntime...');
    this.levelTransitionCountdown = null;
    this.cutsceneRunner = null;
    this.systems.rendering.resetCamera(); // ensure no camera leak on dispose

    if (this.app.ticker) {
      this.app.ticker.remove(this.onTickBound);
    }

    // Clean up event subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Dispose systems in reverse order
    this.systems.ui.dispose();
    this.systems.spawning.dispose();
    this.systems.physics.dispose();
    this.systems.rendering.dispose();
    this.systems.entities.dispose();
    this.systems.audio.dispose();
    this.systems.input.dispose();

    this.initialized = false;
    this.disposed = true;
    logger.info('GameRuntime disposed');
  }

  private setupRuntimeSubscriptions(): void {
    // START_GAME event triggers start()
    this.subscriptions.push(
      this.events.on(GameEvent.START_GAME).subscribe(() => {
        this.start();
      })
    );

    // RESTART_GAME event triggers reset()
    this.subscriptions.push(
      this.events.on(GameEvent.RESTART_GAME).subscribe(() => {
        this.reset();
      })
    );

    // COLLISION_DETECTED triggers game over
    this.subscriptions.push(
      this.events.on(GameEvent.COLLISION_DETECTED).subscribe(() => {
        this.handleGameOver('collision');
      })
    );

    // ORB_COLLECTED checks level completion
    this.subscriptions.push(
      this.events.on(GameEvent.ORB_COLLECTED).subscribe(() => {
        const state = this.state.getState();
        if (state.orbsCollected >= state.orbsRequired && !state.isGameOver) {
          this.handleLevelComplete();
        }
      })
    );

    // TIME_UPDATED checks timeout
    this.subscriptions.push(
      this.events.on(GameEvent.TIME_UPDATED).subscribe(data => {
        if (data && typeof data.timeRemaining === 'number' && data.timeRemaining <= 0) {
          this.handleGameOver('timeout');
        }
      })
    );
  }

  private handleGameOver(reason: string): void {
    const currentState = this.state.getState();
    if (currentState.isGameOver) return;

    logger.info(`Game over triggered (reason: ${reason})`);
    this.state.gameOver();

    const astronaut = this.systems.entities.getAstronaut();
    if (astronaut && !astronaut.dead) {
      astronaut.die();
    }

    this.events.emit(GameEvent.GAME_OVER, { reason });
  }

  private handleLevelComplete(): void {
    if (this.levelTransitionCountdown !== null) return;

    const currentLevel = this.state.getState().level;
    const currentLevelId = this.currentLevelDefinition.id;
    logger.info(`Level ${currentLevelId} complete triggered`);
    this.state.levelComplete();
    this.events.emit(GameEvent.LEVEL_COMPLETE, { level: currentLevel, levelId: currentLevelId });

    // Transition to next level after brief celebration via simulation time countdown
    this.systems.rendering.beginWarp();
    this.levelTransitionCountdown = MOTION.warp;
  }
}
