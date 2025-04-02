import { Application, Ticker } from 'pixi.js';
import inputManager, { InputEvent } from '../game/inputManager';
import { EventBus, GameEvent } from '../game/eventBus';
import { AudioSystem } from '../game/systems/audioSystem';
import { InputSystem } from '../game/systems/inputSystem';
import { GameStateService } from '../game/gameStateService';

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
  
  // Game loop
  private gameLoopFunc: (ticker: Ticker) => void;
  
  constructor(
    app: Application,
    eventBus: EventBus,
    gameStateService: GameStateService,
    inputSystem: InputSystem,
    audioSystem: AudioSystem,
  ) {
    this.app = app;
    this.eventBus = eventBus;
    this.gameStateService = gameStateService;
    
    // Initialize systems
    this.inputSystem = inputSystem;
    this.audioSystem = audioSystem;
    this.gameLoopFunc = () => {};
    
    eventBus.on(GameEvent.START_GAME).subscribe(() => {
        this.gameLoopFunc = this.createGameLoop();
    });
  }
  
  /**
   * Initialize game controller and all systems
   */
  public initialize(): void {
    console.log('GameController: Initializing...');
    
    // Initialize all systems
    this.inputSystem.initialize();
    this.audioSystem.initialize();
    
    // Set up event listeners for game flow
    this.setupEventListeners();
    
    console.log('GameController: Initialization complete');
  }
  
  /**
   * Set up game for first play
   */
  public setupGame(): void {
    console.log('GameController: Setting up game...');
    
    // Reset game state to initial values
    this.gameStateService.resetGame();
    

    // Initialize level
    const currentLevel = this.gameStateService.getState().level;
    // this.initializeLevel(currentLevel);
    
    // Show "Press Space to Start" UI
    // this.eventBus.publish(GameEvent.SHOW_START_PROMPT, null);
    
    console.log('GameController: Setup complete. Waiting for START_ACTION.');
  }
  
  /**
   * Start the game
   */
  public startGame(): void {
    console.log('GameController: Starting game...');
    console.log('%cGameController: Starting game...', 'color: green');
    // Prevent starting if already playing
    if (this.gameStateService.getState().isStarted) {
      console.log('GameController: Game already in progress');
      return;
    }

    // Start game loop if not already running
    if (!this.app.ticker.started) {
      this.app.ticker.add(this.gameLoopFunc);
      this.app.ticker.start();
    }

        // Update game state
        this.gameStateService.startGame();
    
    // Hide start prompt
    // this.eventBus.publish(GameEvent.HIDE_START_PROMPT, null);
    
    console.log('GameController: Game started');
  }
  
  /**
   * Pause the game
   */
//   public pauseGame(): void {
//     if (!this.gameStateService.getState().isStarted) return;
    
//     // this.gameStateService.pauseGame();
//     this.app.ticker.stop();
    
//     // Show pause UI
//     // this.eventBus.publish(GameEvent.SHOW_PAUSE_SCREEN, null);
//   }
  
  /**
   * Resume the game
   */
//   public resumeGame(): void {
//     if (this.gameStateService.getState().isStarted) return;
    
//     this.gameStateService.resumeGame();
//     this.app.ticker.start();
    
//     // Hide pause UI
//     this.eventBus.publish(GameEvent.HIDE_PAUSE_SCREEN, null);
//   }
  
  /**
   * Handle game over
   */
//   public gameOver(): void {
//     console.log('GameController: Game over');
    
//     // Update game state
//     this.gameStateService.setGameOver(true);
    
//     // Stop the game loop
//     this.app.ticker.remove(this.gameLoopFunc);
    
//     // Show game over UI
//     this.eventBus.publish(GameEvent.SHOW_GAME_OVER, null);
//   }
  
  /**
   * Initialize a specific level
   */
//   private initializeLevel(level: number): void {
//     console.log(`GameController: Initializing level ${level}`);
    
//     // Initialize level-specific settings
//     // (obstacles, orbs, speed, etc.)
//     const levelConfig = {
//       // Level configuration would come from some config service
//       obstacleFrequency: 2000 - (level * 200),
//       orbFrequency: 3000,
//       scrollSpeed: 5 + (level * 0.5),
//       // etc.
//     };

//   }
  
  /**
   * Set up event listeners for game flow
   */
  private setupEventListeners(): void {
    // Listen for game events
    this.eventBus.on(GameEvent.START_GAME).subscribe(() => {
    //   console.log('GameController: Received START_ACTION');
      this.startGame();
    });
    
    // ... other event listeners
  }
  
  /**
   * Handle level completion
   */
//   private levelComplete(): void {
//     console.log('GameController: Level complete');
    
//     // Pause game loop temporarily
//     this.app.ticker.stop();
    
//     // Update game state
//     this.gameStateService.levelComplete();
    
//     // Show level complete UI
//     this.eventBus.publish(GameEvent.SHOW_LEVEL_COMPLETE, null);
    
//     // Setup for next level after a delay
//     setTimeout(() => {
//       const nextLevel = this.gameStateService.getState().level;
//       this.initializeLevel(nextLevel);
      
//       // Resume game loop
//       this.app.ticker.start();
      
//       // Hide level complete UI
//       this.eventBus.publish(GameEvent.HIDE_LEVEL_COMPLETE, null);
//     }, 3000); // 3 second delay between levels
//   }
  
  /**
   * Create the main game loop
   */
  private createGameLoop(): (ticker: Ticker) => void {
    return (ticker: Ticker) => {
        console.log('%cGameController: Game loop running', 'color: green');

      // Skip update if game is not playing
      if (!this.gameStateService.getState().isStarted) return;
      
      // Calculate delta time (convert PIXI delta to seconds)
      const deltaTime = ticker.deltaMS / 1000;
      
      // Update game state (decrement time, etc.)
      this.gameStateService.updateTime(deltaTime);
      
      
      // Check win/loss conditions
    //   this.checkGameConditions();
    };
  }
  
//   /**
//    * Check conditions that might end the game
//    */
//   private checkGameConditions(): void {
//     const state = this.gameStateService.getState();
    
//     // Check if time has run out
//     if (state.timeRemaining <= 0 && !state.isGameOver) {
//       this.eventBus.publish(GameEvent.TIME_EXPIRED, null);
//     }
    
//     // Check if all orbs have been collected
//     if (state.orbsCollected >= state.orbCollectionGoal && !state.isGameOver) {
//       this.eventBus.publish(GameEvent.ORB_COLLECTION_GOAL_MET, null);
//     }
//   }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    console.log('GameController: Disposing...');
    
    // Stop game loop
    this.app.ticker.remove(this.gameLoopFunc);
    
    // Dispose all systems
    this.inputSystem.dispose();
    this.audioSystem.dispose();
    
    console.log('GameController: Disposed');
  }
}
