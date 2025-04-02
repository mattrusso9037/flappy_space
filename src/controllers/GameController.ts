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
    this.gameLoopFunc = this.createGameLoop();
    console.log('GameController: Constructor completed');
  }
  
  /**
   * Initialize game controller and all systems
   */
  public initialize(): void {
    console.log('GameController: Initializing...');
    
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
    
    // Set up event listeners for game flow
    console.log('GameController: Setting up event listeners');
    this.setupEventListeners();
    
    console.log('GameController: Initialization complete');
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
    
    // Initialize level
    const currentLevel = this.gameStateService.getState().level;
    console.log(`GameController: Initializing level ${currentLevel}`);
    this.initializeLevel(currentLevel);
    
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
    
    // Update game state
    console.log('GameController: Calling gameStateService.startGame()');
    this.gameStateService.startGame();
    
    // Start game loop if not already running
    if (!this.app.ticker.started) {
      console.log('GameController: Adding game loop to ticker');
      this.app.ticker.add(this.gameLoopFunc);
      console.log('GameController: Starting ticker');
      this.app.ticker.start();
    } else {
      console.log('GameController: Ticker already started');
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
    
    // Stop the game loop
    console.log('GameController: Removing game loop from ticker');
    this.app.ticker.remove(this.gameLoopFunc);
    
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
      scrollSpeed: 5 + (level * 0.5),
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
    
    // Create initial background elements
    console.log('GameController: Creating background');
    this.renderSystem.createBackground();
    
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
      // Skip update if game is not started or is game over
      const gameState = this.gameStateService.getState();
      if (!gameState.isStarted || gameState.isGameOver) {
        // Only log occasionally to avoid console spam
        if (Math.random() < 0.01) {
          console.log(`GameController: Game loop skipped - isStarted: ${gameState.isStarted}, isGameOver: ${gameState.isGameOver}`);
        }
        return;
      }
      
      // Calculate delta time (convert PIXI delta to seconds)
      const deltaTime = ticker.deltaMS / 1000;
      
      // Update game state (decrement time, etc.)
      this.gameStateService.updateTime(deltaTime);
      
      // Update systems
      this.physicsSystem.update(deltaTime, this.entityManager.getAllEntities());
      this.spawningSystem.update(deltaTime, this.gameStateService.getState());
      
      // Let render system update visuals based on current entity states
      this.renderSystem.update(deltaTime, this.entityManager.getAllEntities());
      
      // Update UI
      this.uiSystem.update();
      
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