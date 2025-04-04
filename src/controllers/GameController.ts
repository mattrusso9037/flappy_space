import { Application, Ticker } from 'pixi.js';
import inputManager, { InputEvent } from '../game/inputManager';
import { EventBus, GameEvent } from '../game/eventBus';
import { AudioSystem } from '../game/systems/audioSystem';
import { InputSystem } from '../game/systems/inputSystem';
import { GameStateService, GameState } from '../game/gameStateService';
import { LEVELS } from '../game/config';
import { getLogger } from '../utils/logger';

// Create a contextualized logger for GameController
const logger = getLogger('GameController');

/**
 * GameController orchestrates all game systems and manages the game flow
 */
export class GameController {
  private app: Application;
  private eventBus: EventBus;
  private gameStateService: GameStateService;
  
  // Game systems
  private inputSystem: InputSystem;
  private audioSystem: AudioSystem;
  private entityManager: any;
  private renderSystem: any;
  private physicsSystem: any;
  private spawningSystem: any;
  private uiSystem: any;
  
  // Game loop
  private gameLoopFunc: (ticker: Ticker) => void;
  private initialized: boolean = false;
  
  constructor(
    app: Application,
    eventBus: EventBus,
    gameStateService: GameStateService,
    inputSystem: InputSystem,
    audioSystem: AudioSystem,
    entityManager: any,
    renderSystem: any,
    physicsSystem: any,
    spawningSystem: any,
    uiSystem: any
  ) {
    logger.info('Constructor called');
    this.app = app;
    this.eventBus = eventBus;
    this.gameStateService = gameStateService;
    
    // Initialize systems
    this.inputSystem = inputSystem;
    this.audioSystem = audioSystem;
    this.entityManager = entityManager;
    this.renderSystem = renderSystem;
    this.physicsSystem = physicsSystem;
    this.spawningSystem = spawningSystem;
    this.uiSystem = uiSystem;
    
    // Create game loop
    logger.info('Creating game loop function');
    this.gameLoopFunc = this.createGameLoop();
    
    logger.debug('Is app.ticker available?', !!this.app.ticker);
    logger.info('Constructor completed');
  }
  
  /**
   * Initialize game controller and all systems
   */
  public initialize(): void {
    if (this.initialized) {
      logger.warn('Already initialized, skipping');
      return;
    }
    
    logger.info('Initializing...');
    this.app = this.app;
    
    // Initialize all systems
    logger.debug('Initializing InputSystem');
    this.inputSystem.initialize();
    
    logger.debug('Initializing AudioSystem');
    this.audioSystem.initialize();
    
    logger.debug('Initializing EntityManager');
    this.entityManager.initialize(this.app);
    
    logger.debug('Initializing RenderSystem');
    this.renderSystem.initialize(this.app);
    
    logger.debug('Initializing PhysicsSystem');
    this.physicsSystem.initialize();
    
    logger.debug('Initializing SpawningSystem');
    this.spawningSystem.initialize();
    
    logger.debug('Initializing UISystem');
    try {
      this.uiSystem.initialize(this.app);
    } catch (uiError) {
      logger.error('Failed to initialize UISystem:', uiError);
      // Continue initialization despite UI error - game can function without UI
    }
    
    // Create the game loop function
    this.gameLoopFunc = this.createGameLoop();
    
    // Create the background right away
    this.renderSystem.createBackground();
    
    // Start the ticker immediately just for background animation
    if (this.app.ticker) {
      logger.info('Starting ticker for background animation');
      this.app.ticker.add(this.gameLoopFunc);
      this.app.ticker.start();
    } else {
      logger.error('Ticker not available');
    }
    
    this.initialized = true;
    logger.info('Initialization complete');
    
    // Initialize loading events
    this.setupEventListeners();
  }
  
  /**
   * Set up game for first play
   */
  public setupGame(): void {
    logger.info('Setting up game...');
    
    // Reset game state to initial values
    logger.info('Resetting game state');
    this.gameStateService.resetGame();
    
    // Clear all entities
    logger.info('Clearing all entities');
    this.entityManager.clearAll();
    
    // Explicitly reset spawning system
    logger.info('Resetting spawning system');
    this.spawningSystem.resetSpawning();
    
    // Enable speed diagnostics for tracking speed issues
    logger.info('Enabling speed diagnostics');
    this.physicsSystem.setSpeedDiagnostics(true, 3000); // Check speeds every 3 seconds
    
    // Initialize level
    const currentLevel = this.gameStateService.getState().level;
    logger.info(`Initializing level ${currentLevel}`);
    this.initializeLevel(currentLevel);

    // Reset ticker speed to 1
    if (this.app?.ticker) {
        logger.info('Resetting ticker speed to 1');
        this.app.ticker.speed = 1;
      }
    
    // Double-check that the astronaut was created
    const astronaut = this.entityManager.getAstronaut();
    if (!astronaut) {
      logger.info('Astronaut not created during initialization. Creating it now.');
      this.entityManager.createAstronaut();
    } else {
      logger.info('Astronaut position verified - x:', astronaut.sprite.x, 'y:', astronaut.sprite.y);
    }
    
    // Make sure ticker has the background update function added
    // First remove to avoid duplicates
    logger.info('Updating background ticker function');
    this.app.ticker.remove(this.gameLoopFunc);
    this.app.ticker.add(this.gameLoopFunc);
    
    // Ensure ticker is running for background animation
    if (!this.app.ticker.started) {
      logger.info('Starting ticker for background animation');
      this.app.ticker.start();
    }
    
    // Show "Press Space to Start" UI
    logger.info('Showing start prompt');
    this.eventBus.emit(GameEvent.SHOW_START_PROMPT, null);
    
    logger.info('Setup complete. Waiting for START_GAME.');
  }
  
  /**
   * Start the game
   */
  public startGame(): void {
    logger.info('startGame() called');
    
    // Prevent starting if already playing
    if (this.gameStateService.getState().isStarted) {
      logger.info('Game already in progress, ignoring start request');
      return;
    }
    
    // Log diagnostic info
    logger.info('DIAGNOSTIC INFO:');
    logger.info('- Game state:', this.gameStateService.getState());
    logger.info('- Astronaut exists:', !!this.entityManager.getAstronaut());
    logger.info('- Obstacles count:', this.entityManager.getObstacles().length);
    logger.info('- Orbs count:', this.entityManager.getOrbs().length);
    logger.info('- Stars count:', this.entityManager.getStars().length);
    
    // Update game state
    logger.info('Calling gameStateService.startGame()');
    this.gameStateService.startGame();
    
    // Debugging ticker state
    logger.info('app =', this.app);
    logger.info('app.ticker =', this.app.ticker);
    logger.info('app.ticker.started =', this.app.ticker ? this.app.ticker.started : 'ticker undefined');
    logger.info('gameLoopFunc =', typeof this.gameLoopFunc === 'function' ? 'function defined' : this.gameLoopFunc);
    
    // Ensure the game loop is added to ticker (it might have been removed on game over)
    // First remove it to avoid duplicate handlers
    logger.info('Removing any existing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Then add it back
    logger.info('Adding game loop to ticker');
    this.app.ticker.add(this.gameLoopFunc);
    
    // Start the ticker if it's not already running
    if (!this.app.ticker.started) {
      logger.info('Ticker not started, starting it now');
      try {
        this.app.ticker.start();
        logger.info('Ticker started successfully');
        
        // Verify game state after ticker start
        const stateAfterStart = this.gameStateService.getState();
        logger.info(`GameController: Game state after start - isStarted: ${stateAfterStart.isStarted}, tickerStarted: ${this.app.ticker.started}`);
        
        // Force a full update cycle immediately to verify systems are working
        logger.info('Forcing initial update cycle...');
        this.gameLoopFunc({deltaTime: 1/60, deltaMS: 16.667, elapsedMS: 16.667} as Ticker);
      } catch (error) {
        logger.error('Error starting ticker:', error);
      }
    } else {
      logger.info('Ticker already started');
      
      // Force an update cycle anyway to ensure systems start working immediately
      logger.info('Forcing initial update cycle on already running ticker...');
      this.gameLoopFunc({deltaTime: 1/60, deltaMS: 16.667, elapsedMS: 16.667} as Ticker);
    }
    
    // Hide start prompt
    logger.info('Hiding start prompt');
    this.eventBus.emit(GameEvent.HIDE_START_PROMPT, null);
    
    logger.info('Game started');
  }
  
  /**
   * Pause the game
   */
  public pauseGame(): void {
    if (!this.gameStateService.getState().isStarted) return;
    
    logger.info('Pausing game');
    // Stop the ticker
    this.app.ticker.stop();
    
    logger.info('Game paused');
    // Since there is no pauseGame method in GameStateService, we need to update state manually
    // For now, this is handled by stopping the ticker
    
    // In a future update, GameStateService should have a pauseGame method
  }
  
  /**
   * Resume the game
   */
  public resumeGame(): void {
    if (this.gameStateService.getState().isGameOver) return;
    
    logger.info('Resuming game');
    // Start the ticker again
    this.app.ticker.start();
    
    logger.info('Game resumed');
    // In a future update, GameStateService should have a resumeGame method
  }
  
  /**
   * Handle game over
   */
  public gameOver(): void {
    logger.info('Game over');
    
    // Update game state
    logger.info('Calling gameStateService.gameOver()');
    this.gameStateService.gameOver();
    
    // Remove the game loop from ticker but don't stop the ticker
    // This allows background animations to continue
    logger.info('Removing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Ensure the astronaut is visibly in a "dead" state
    const astronaut = this.entityManager.getAstronaut();
    if (astronaut && !astronaut.dead) {
      logger.info('Setting astronaut to dead state');
      astronaut.die();
    }
    
    // Game over UI will be shown via the GameStateService event publisher
    logger.info('Game over processing complete');
  }
  
  /**
   * Initialize a specific level
   */
  private initializeLevel(level: number): void {
    logger.info(`Initializing level ${level}`);

    // Get the full configuration for the current level from config.ts
    // Note: Adjust index since level numbers are 1-based, array is 0-based
    let currentLevelConfig = LEVELS[level - 1];
    if (!currentLevelConfig) {
      logger.error(`Invalid level number ${level}. Cannot find config. Falling back to level 1.`);
      currentLevelConfig = LEVELS[0]; // Fallback to level 1 config
    }

    // Prepare the config object specifically for the spawning system
    // Ensure it includes the 'speed' property from the LEVELS config
    const spawningConfig = {
      speed: currentLevelConfig.speed, // <-- Use speed from LEVELS
      spawnInterval: currentLevelConfig.spawnInterval,
      // Include orbFrequency if defined in LEVELS, otherwise use a default or omit
      orbFrequency: currentLevelConfig.orbFrequency || 3000
    };

    logger.info(`GameController: Level config for SpawningSystem:`, spawningConfig);

    // Set level config in SpawningSystem
    logger.info('GameController: Setting level config in SpawningSystem');
    this.spawningSystem.setLevelConfig(spawningConfig);

    // Create astronaut
    logger.info('GameController: Creating astronaut entity');
    const astronaut = this.entityManager.createAstronaut();
    if (astronaut) {
      logger.info(`GameController: Astronaut created at position (${astronaut.sprite.x}, ${astronaut.sprite.y})`);
    } else {
      logger.error('GameController: Failed to create astronaut');
    }

    // Create initial background elements
    logger.info('GameController: Creating background');
    this.renderSystem.createBackground();

    // Set up ticker for background animation
    // First remove to avoid duplicates
    logger.info('Updating ticker for background animation');
    this.app.ticker.remove(this.gameLoopFunc);
    this.app.ticker.add(this.gameLoopFunc);

    // Ensure the ticker is running
    if (!this.app.ticker.started) {
      logger.info('Starting ticker for background animation');
      this.app.ticker.start();
    } else {
      logger.info('Ticker already running for background animation');
    }

    logger.info(`GameController: Level ${level} initialization complete`);
  }
  
  /**
   * Set up event listeners for game flow
   */
  private setupEventListeners(): void {
    logger.info('Setting up event listeners');
    
    // Listen for game events
    logger.info('Subscribing to START_GAME event');
    this.eventBus.on(GameEvent.START_GAME).subscribe(() => {
      logger.info('Received START_GAME event from EventBus');
      this.startGame();
    });

    this.eventBus.on(GameEvent.RESTART_GAME).subscribe(() => {
      logger.info('Received RESTART_GAME event from EventBus');
      this.setupGame();
    });
    
    logger.info('Subscribing to COLLISION_DETECTED event');
    this.eventBus.on(GameEvent.COLLISION_DETECTED).subscribe(() => {
      logger.info('Received COLLISION_DETECTED');
      this.gameOver();
    });
    
    logger.info('Subscribing to ORB_COLLECTED event');
    this.eventBus.on(GameEvent.ORB_COLLECTED).subscribe((data: any) => {
      logger.info(`GameController: Received ORB_COLLECTED, data:`, data);
      // Check if all orbs have been collected
      const state = this.gameStateService.getState();
      logger.info(`GameController: Current state - orbsCollected: ${state.orbsCollected}, orbsRequired: ${state.orbsRequired}, isGameOver: ${state.isGameOver}`);
      
      if (state.orbsCollected >= state.orbsRequired && !state.isGameOver) {
        logger.info('GameController: Orb collection goal met');
        this.levelComplete();
      }
    });
    
    logger.info('Subscribing to TIME_UPDATED event');
    this.eventBus.on(GameEvent.TIME_UPDATED).subscribe((data: any) => {
      logger.info(`GameController: Received TIME_UPDATED, data:`, data);
      // Check if time ran out
      if (data && data.timeRemaining <= 0) {
        logger.info('GameController: Time expired');
        this.gameOver();
      }
    });
    
    logger.info('Event listeners setup complete');
    // ... other event listeners
  }
  
  /**
   * Handle level completion
   */
  public levelComplete(): void {
    logger.info('Level complete');
    
    // Pause game loop temporarily
    logger.info('Stopping ticker for level transition');
    this.app.ticker.stop();
    
    // Update game state
    logger.info('Calling gameStateService.levelComplete()');
    this.gameStateService.levelComplete();
    
    // Level complete UI will be shown via the GameStateService event publisher
    logger.info('GameController: Level complete UI should be shown');
    
    // Setup for next level after a delay
    logger.info('Setting up timeout for next level');
    setTimeout(() => {
      const nextLevel = this.gameStateService.getState().level;
      logger.info(`GameController: Initializing next level (${nextLevel})`);
      this.initializeLevel(nextLevel);
      
      // Resume game loop
      logger.info('Restarting ticker');
      this.app.ticker.start();
      
      logger.info('Level transition complete');
    }, 3000); // 3 second delay between levels
  }
  
  /**
   * Create the main game loop
   */
  private createGameLoop(): (ticker: Ticker) => void {
    logger.info('Creating game loop function');
    
    return (ticker: Ticker) => {
      // Occasionally log ticker state for debugging
      if (Math.random() < 0.01) {
        logger.info(`GameController: Ticker running - deltaMS: ${ticker.deltaMS}, started: ${ticker.started}, minFPS: ${ticker.minFPS}, maxFPS: ${ticker.maxFPS}`);
      }
      
      const gameState = this.gameStateService.getState();
      const deltaTime = ticker.deltaMS / 1000;
      
      // Even if the game isn't started, we should update the stars for background animation
      try {
        // Update star animations regardless of game state
        this.renderSystem.updateBackground(deltaTime);
      } catch (error) {
        logger.error('GameController: Error updating background:', error);
      }
      
      // Skip the rest of the updates if game is not started or is game over
      if (!gameState.isStarted || gameState.isGameOver) {
        // Only log occasionally to avoid console spam
        if (Math.random() < 0.01) {
          logger.info(`GameController: Main game loop skipped - isStarted: ${gameState.isStarted}, isGameOver: ${gameState.isGameOver}`);
        }
        return;
      }
      
      // Log occasionally to verify the loop is running
      if (Math.random() < 0.01) {
        logger.info(`GameController: Game loop running - delta: ${ticker.deltaMS}ms`);
      }
      
      // Update game state (decrement time, etc.)
      this.gameStateService.updateTime(ticker.deltaMS);
      
      // Update systems
      try {
        // Debug the entities we're updating
        if (Math.random() < 0.01) {
          const entities = this.entityManager.getAllEntities();
          logger.info(`GameController: Updating ${entities.length} entities`);
          
          // Check if astronaut exists
          const astronaut = this.entityManager.getAstronaut();
          if (astronaut) {
            logger.info(`GameController: Astronaut position: (${astronaut.sprite.x}, ${astronaut.sprite.y})`);
          } else {
            logger.warn('GameController: No astronaut found!');
          }
        }
        
        // Update physics
        logger.info('GameController: Updating physics...');
        this.physicsSystem.update(deltaTime, this.entityManager.getAllEntities());
        
        // Update spawning
        logger.info('GameController: Updating spawning...');
        this.spawningSystem.update(deltaTime, this.gameStateService.getState());
        
        // Let render system update visuals based on current entity states
        logger.info('GameController: Updating rendering...');
        this.renderSystem.update(deltaTime, this.entityManager.getAllEntities());
        
        // Update UI
        logger.info('GameController: Updating UI...');
        this.uiSystem.update();
      } catch (error) {
        logger.error('GameController: Error in game loop update:', error);
      }
      
      // Check win/loss conditions
      this.checkGameConditions();
    };
  }
  
  /**
   * Check conditions that might end the game
   */
  private checkGameConditions(): void {
    const state = this.gameStateService.getState();
    
    // Check if time has run out
    if (state.timeRemaining <= 0 && !state.isGameOver) {
      logger.info('GameController: Time has run out, emitting TIME_UPDATED event');
      this.eventBus.emit(GameEvent.TIME_UPDATED, { timeRemaining: 0, timeRanOut: true });
    }
    
    // Check if all orbs have been collected
    if (state.orbsCollected >= state.orbsRequired && !state.isGameOver) {
      logger.info('GameController: All orbs collected, emitting ORB_COLLECTED event');
      this.eventBus.emit(GameEvent.ORB_COLLECTED, state.orbsCollected);
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    logger.info('Disposing...');
    
    // Stop game loop
    logger.info('Removing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Dispose all systems
    logger.info('Disposing InputSystem');
    this.inputSystem.dispose();
    
    logger.info('Disposing AudioSystem');
    this.audioSystem.dispose();
    
    logger.info('Disposing EntityManager');
    this.entityManager.dispose();
    
    logger.info('Disposing RenderSystem');
    this.renderSystem.dispose();
    
    logger.info('Disposing PhysicsSystem');
    this.physicsSystem.dispose();
    
    logger.info('Disposing SpawningSystem');
    this.spawningSystem.dispose();
    
    logger.info('Disposing UISystem');
    this.uiSystem.dispose();
    
    logger.info('Disposed');
  }
}