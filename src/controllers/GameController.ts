import { Application, Ticker } from 'pixi.js';
import inputManager, { InputEvent } from '../game/inputManager';
import { EventBus, GameEvent } from '../game/eventBus';
import { AudioSystem } from '../game/systems/audioSystem';
import { InputSystem } from '../game/systems/inputSystem';
import { GameStateService, GameState } from '../game/gameStateService';

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
    console.log('GameController: Constructor called');
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
    console.log('GameController: Creating game loop function');
    this.gameLoopFunc = this.createGameLoop();
    
    console.log('GameController: Is app.ticker available?', !!this.app.ticker);
    console.log('GameController: Constructor completed');
  }
  
  /**
   * Initialize game controller and all systems
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('GameController already initialized');
      return;
    }
    
    console.log('GameController: Initializing...');
    this.app = this.app;
    
    // Initialize all systems
    console.log('GameController: Initializing InputSystem');
    this.inputSystem.initialize();
    
    console.log('GameController: Initializing AudioSystem');
    this.audioSystem.initialize();
    
    console.log('GameController: Initializing EntityManager');
    this.entityManager.initialize(this.app);
    
    console.log('GameController: Initializing RenderSystem');
    this.renderSystem.initialize(this.app);
    
    console.log('GameController: Initializing PhysicsSystem');
    this.physicsSystem.initialize();
    
    console.log('GameController: Initializing SpawningSystem');
    this.spawningSystem.initialize();
    
    console.log('GameController: Initializing UISystem');
    try {
      this.uiSystem.initialize(this.app);
    } catch (uiError) {
      console.error('GameController: Failed to initialize UISystem:', uiError);
      // Continue initialization despite UI error - game can function without UI
    }
    
    // Create the game loop function
    this.gameLoopFunc = this.createGameLoop();
    
    // Create the background right away
    this.renderSystem.createBackground();
    
    // Start the ticker immediately just for background animation
    if (this.app.ticker) {
      console.log('GameController: Starting ticker for background animation');
      this.app.ticker.add(this.gameLoopFunc);
      this.app.ticker.start();
    } else {
      console.error('GameController: Ticker not available');
    }
    
    this.initialized = true;
    console.log('GameController: Initialization complete');
    
    // Initialize loading events
    this.setupEventListeners();
  }
  
  /**
   * Set up game for first play
   */
  public setupGame(): void {
    console.log('GameController: Setting up game...');
    
    // Reset game state to initial values
    console.log('GameController: Resetting game state');
    this.gameStateService.resetGame();
    
    // Clear all entities
    console.log('GameController: Clearing all entities');
    this.entityManager.clearAll();
    
    // Explicitly reset spawning system
    console.log('GameController: Resetting spawning system');
    this.spawningSystem.resetSpawning();
    
    // Initialize level
    const currentLevel = this.gameStateService.getState().level;
    console.log(`GameController: Initializing level ${currentLevel}`);
    this.initializeLevel(currentLevel);
    
    // Double-check that the astronaut was created
    const astronaut = this.entityManager.getAstronaut();
    if (!astronaut) {
      console.log('GameController: Astronaut not created during initialization. Creating it now.');
      this.entityManager.createAstronaut();
    } else {
      console.log('GameController: Astronaut position verified - x:', astronaut.sprite.x, 'y:', astronaut.sprite.y);
    }
    
    // Make sure ticker has the background update function added
    // First remove to avoid duplicates
    console.log('GameController: Updating background ticker function');
    this.app.ticker.remove(this.gameLoopFunc);
    this.app.ticker.add(this.gameLoopFunc);
    
    // Ensure ticker is running for background animation
    if (!this.app.ticker.started) {
      console.log('GameController: Starting ticker for background animation');
      this.app.ticker.start();
    }
    
    // Show "Press Space to Start" UI
    console.log('GameController: Showing start prompt');
    this.eventBus.emit(GameEvent.SHOW_START_PROMPT, null);
    
    console.log('GameController: Setup complete. Waiting for START_GAME.');
  }
  
  /**
   * Start the game
   */
  public startGame(): void {
    console.log('GameController: startGame() called');
    
    // Prevent starting if already playing
    if (this.gameStateService.getState().isStarted) {
      console.log('GameController: Game already in progress, ignoring start request');
      return;
    }
    
    // Log diagnostic info
    console.log('GameController: DIAGNOSTIC INFO:');
    console.log('- Game state:', this.gameStateService.getState());
    console.log('- Astronaut exists:', !!this.entityManager.getAstronaut());
    console.log('- Obstacles count:', this.entityManager.getObstacles().length);
    console.log('- Orbs count:', this.entityManager.getOrbs().length);
    console.log('- Stars count:', this.entityManager.getStars().length);
    
    // Update game state
    console.log('GameController: Calling gameStateService.startGame()');
    this.gameStateService.startGame();
    
    // Debugging ticker state
    console.log('GameController: app =', this.app);
    console.log('GameController: app.ticker =', this.app.ticker);
    console.log('GameController: app.ticker.started =', this.app.ticker ? this.app.ticker.started : 'ticker undefined');
    console.log('GameController: gameLoopFunc =', typeof this.gameLoopFunc === 'function' ? 'function defined' : this.gameLoopFunc);
    
    // Ensure the game loop is added to ticker (it might have been removed on game over)
    // First remove it to avoid duplicate handlers
    console.log('GameController: Removing any existing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Then add it back
    console.log('GameController: Adding game loop to ticker');
    this.app.ticker.add(this.gameLoopFunc);
    
    // Start the ticker if it's not already running
    if (!this.app.ticker.started) {
      console.log('GameController: Ticker not started, starting it now');
      try {
        this.app.ticker.start();
        console.log('GameController: Ticker started successfully');
        
        // Verify game state after ticker start
        const stateAfterStart = this.gameStateService.getState();
        console.log(`GameController: Game state after start - isStarted: ${stateAfterStart.isStarted}, tickerStarted: ${this.app.ticker.started}`);
        
        // Force a full update cycle immediately to verify systems are working
        console.log('GameController: Forcing initial update cycle...');
        this.gameLoopFunc({deltaTime: 1/60, deltaMS: 16.667, elapsedMS: 16.667} as Ticker);
      } catch (error) {
        console.error('GameController: Error starting ticker:', error);
      }
    } else {
      console.log('GameController: Ticker already started');
      
      // Force an update cycle anyway to ensure systems start working immediately
      console.log('GameController: Forcing initial update cycle on already running ticker...');
      this.gameLoopFunc({deltaTime: 1/60, deltaMS: 16.667, elapsedMS: 16.667} as Ticker);
    }
    
    // Hide start prompt
    console.log('GameController: Hiding start prompt');
    this.eventBus.emit(GameEvent.HIDE_START_PROMPT, null);
    
    console.log('GameController: Game started');
  }
  
  /**
   * Pause the game
   */
  public pauseGame(): void {
    if (!this.gameStateService.getState().isStarted) return;
    
    console.log('GameController: Pausing game');
    // Stop the ticker
    this.app.ticker.stop();
    
    console.log('GameController: Game paused');
    // Since there is no pauseGame method in GameStateService, we need to update state manually
    // For now, this is handled by stopping the ticker
    
    // In a future update, GameStateService should have a pauseGame method
  }
  
  /**
   * Resume the game
   */
  public resumeGame(): void {
    if (this.gameStateService.getState().isGameOver) return;
    
    console.log('GameController: Resuming game');
    // Start the ticker again
    this.app.ticker.start();
    
    console.log('GameController: Game resumed');
    // In a future update, GameStateService should have a resumeGame method
  }
  
  /**
   * Handle game over
   */
  public gameOver(): void {
    console.log('GameController: Game over');
    
    // Update game state
    console.log('GameController: Calling gameStateService.gameOver()');
    this.gameStateService.gameOver();
    
    // Remove the game loop from ticker but don't stop the ticker
    // This allows background animations to continue
    console.log('GameController: Removing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Ensure the astronaut is visibly in a "dead" state
    const astronaut = this.entityManager.getAstronaut();
    if (astronaut && !astronaut.dead) {
      console.log('GameController: Setting astronaut to dead state');
      astronaut.die();
    }
    
    // Game over UI will be shown via the GameStateService event publisher
    console.log('GameController: Game over processing complete');
  }
  
  /**
   * Initialize a specific level
   */
  private initializeLevel(level: number): void {
    console.log(`GameController: Initializing level ${level}`);
    
    // Initialize level-specific settings
    // (obstacles, orbs, speed, etc.)
    const levelConfig = {
      // Level configuration would come from some config service
      obstacleFrequency: 2000 - (level * 200),
      orbFrequency: 3000,
      scrollSpeed: .05 + (level * 0.03),
      // etc.
    };
    console.log(`GameController: Level config - obstacleFrequency: ${levelConfig.obstacleFrequency}, orbFrequency: ${levelConfig.orbFrequency}, scrollSpeed: ${levelConfig.scrollSpeed}`);
    
    // Set level config
    console.log('GameController: Setting level config in SpawningSystem');
    this.spawningSystem.setLevelConfig(levelConfig);
    
    console.log('GameController: Setting scroll speed in PhysicsSystem');
    this.physicsSystem.setScrollSpeed(levelConfig.scrollSpeed);
    
    // Create astronaut
    console.log('GameController: Creating astronaut entity');
    const astronaut = this.entityManager.createAstronaut();
    if (astronaut) {
      console.log(`GameController: Astronaut created at position (${astronaut.sprite.x}, ${astronaut.sprite.y})`);
    } else {
      console.error('GameController: Failed to create astronaut');
    }
    
    // Create initial background elements
    console.log('GameController: Creating background');
    this.renderSystem.createBackground();
    
    // Set up ticker for background animation
    // First remove to avoid duplicates
    console.log('GameController: Updating ticker for background animation');
    this.app.ticker.remove(this.gameLoopFunc);
    this.app.ticker.add(this.gameLoopFunc);
    
    // Ensure the ticker is running
    if (!this.app.ticker.started) {
      console.log('GameController: Starting ticker for background animation');
      this.app.ticker.start();
    } else {
      console.log('GameController: Ticker already running for background animation');
    }
    
    console.log(`GameController: Level ${level} initialization complete`);
  }
  
  /**
   * Set up event listeners for game flow
   */
  private setupEventListeners(): void {
    console.log('GameController: Setting up event listeners');
    
    // Listen for game events
    console.log('GameController: Subscribing to START_GAME event');
    this.eventBus.on(GameEvent.START_GAME).subscribe(() => {
      console.log('GameController: Received START_GAME event from EventBus');
      this.startGame();
    });

    this.eventBus.on(GameEvent.RESTART_GAME).subscribe(() => {
      console.log('GameController: Received RESTART_GAME event from EventBus');
      this.setupGame();
    });
    
    console.log('GameController: Subscribing to COLLISION_DETECTED event');
    this.eventBus.on(GameEvent.COLLISION_DETECTED).subscribe(() => {
      console.log('GameController: Received COLLISION_DETECTED');
      this.gameOver();
    });
    
    console.log('GameController: Subscribing to ORB_COLLECTED event');
    this.eventBus.on(GameEvent.ORB_COLLECTED).subscribe((data: any) => {
      console.log(`GameController: Received ORB_COLLECTED, data:`, data);
      // Check if all orbs have been collected
      const state = this.gameStateService.getState();
      console.log(`GameController: Current state - orbsCollected: ${state.orbsCollected}, orbsRequired: ${state.orbsRequired}, isGameOver: ${state.isGameOver}`);
      
      if (state.orbsCollected >= state.orbsRequired && !state.isGameOver) {
        console.log('GameController: Orb collection goal met');
        this.levelComplete();
      }
    });
    
    console.log('GameController: Subscribing to TIME_UPDATED event');
    this.eventBus.on(GameEvent.TIME_UPDATED).subscribe((data: any) => {
      console.log(`GameController: Received TIME_UPDATED, data:`, data);
      // Check if time ran out
      if (data && data.timeRemaining <= 0) {
        console.log('GameController: Time expired');
        this.gameOver();
      }
    });
    
    console.log('GameController: Event listeners setup complete');
    // ... other event listeners
  }
  
  /**
   * Handle level completion
   */
  public levelComplete(): void {
    console.log('GameController: Level complete');
    
    // Pause game loop temporarily
    console.log('GameController: Stopping ticker for level transition');
    this.app.ticker.stop();
    
    // Update game state
    console.log('GameController: Calling gameStateService.levelComplete()');
    this.gameStateService.levelComplete();
    
    // Level complete UI will be shown via the GameStateService event publisher
    console.log('GameController: Level complete UI should be shown');
    
    // Setup for next level after a delay
    console.log('GameController: Setting up timeout for next level');
    setTimeout(() => {
      const nextLevel = this.gameStateService.getState().level;
      console.log(`GameController: Initializing next level (${nextLevel})`);
      this.initializeLevel(nextLevel);
      
      // Resume game loop
      console.log('GameController: Restarting ticker');
      this.app.ticker.start();
      
      console.log('GameController: Level transition complete');
    }, 3000); // 3 second delay between levels
  }
  
  /**
   * Create the main game loop
   */
  private createGameLoop(): (ticker: Ticker) => void {
    console.log('GameController: Creating game loop function');
    
    return (ticker: Ticker) => {
      // Occasionally log ticker state for debugging
      if (Math.random() < 0.01) {
        console.log(`GameController: Ticker running - deltaMS: ${ticker.deltaMS}, started: ${ticker.started}, minFPS: ${ticker.minFPS}, maxFPS: ${ticker.maxFPS}`);
      }
      
      const gameState = this.gameStateService.getState();
      const deltaTime = ticker.deltaMS / 1000;
      
      // Even if the game isn't started, we should update the stars for background animation
      try {
        // Update star animations regardless of game state
        this.renderSystem.updateBackground(deltaTime);
      } catch (error) {
        console.error('GameController: Error updating background:', error);
      }
      
      // Skip the rest of the updates if game is not started or is game over
      if (!gameState.isStarted || gameState.isGameOver) {
        // Only log occasionally to avoid console spam
        if (Math.random() < 0.01) {
          console.log(`GameController: Main game loop skipped - isStarted: ${gameState.isStarted}, isGameOver: ${gameState.isGameOver}`);
        }
        return;
      }
      
      // Log occasionally to verify the loop is running
      if (Math.random() < 0.01) {
        console.log(`GameController: Game loop running - delta: ${ticker.deltaMS}ms`);
      }
      
      // Update game state (decrement time, etc.)
      this.gameStateService.updateTime(ticker.deltaMS);
      
      // Update systems
      try {
        // Debug the entities we're updating
        if (Math.random() < 0.01) {
          const entities = this.entityManager.getAllEntities();
          console.log(`GameController: Updating ${entities.length} entities`);
          
          // Check if astronaut exists
          const astronaut = this.entityManager.getAstronaut();
          if (astronaut) {
            console.log(`GameController: Astronaut position: (${astronaut.sprite.x}, ${astronaut.sprite.y})`);
          } else {
            console.warn('GameController: No astronaut found!');
          }
        }
        
        // Update physics
        console.log('GameController: Updating physics...');
        this.physicsSystem.update(deltaTime, this.entityManager.getAllEntities());
        
        // Update spawning
        console.log('GameController: Updating spawning...');
        this.spawningSystem.update(deltaTime, this.gameStateService.getState());
        
        // Let render system update visuals based on current entity states
        console.log('GameController: Updating rendering...');
        this.renderSystem.update(deltaTime, this.entityManager.getAllEntities());
        
        // Update UI
        console.log('GameController: Updating UI...');
        this.uiSystem.update();
      } catch (error) {
        console.error('GameController: Error in game loop update:', error);
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
      console.log('GameController: Time has run out, emitting TIME_UPDATED event');
      this.eventBus.emit(GameEvent.TIME_UPDATED, { timeRemaining: 0, timeRanOut: true });
    }
    
    // Check if all orbs have been collected
    if (state.orbsCollected >= state.orbsRequired && !state.isGameOver) {
      console.log('GameController: All orbs collected, emitting ORB_COLLECTED event');
      this.eventBus.emit(GameEvent.ORB_COLLECTED, state.orbsCollected);
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    console.log('GameController: Disposing...');
    
    // Stop game loop
    console.log('GameController: Removing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Dispose all systems
    console.log('GameController: Disposing InputSystem');
    this.inputSystem.dispose();
    
    console.log('GameController: Disposing AudioSystem');
    this.audioSystem.dispose();
    
    console.log('GameController: Disposing EntityManager');
    this.entityManager.dispose();
    
    console.log('GameController: Disposing RenderSystem');
    this.renderSystem.dispose();
    
    console.log('GameController: Disposing PhysicsSystem');
    this.physicsSystem.dispose();
    
    console.log('GameController: Disposing SpawningSystem');
    this.spawningSystem.dispose();
    
    console.log('GameController: Disposing UISystem');
    this.uiSystem.dispose();
    
    console.log('GameController: Disposed');
  }
}