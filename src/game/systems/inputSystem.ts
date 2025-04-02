import { eventBus, GameEvent } from '../eventBus';
import { gameStateService } from '../gameStateService';
import inputManager, { InputEvent } from '../inputManager';
import { Subscription } from 'rxjs';

/**
 * InputSystem processes user input and dispatches game events.
 * It abstracts the low-level input handling from the game logic.
 */
export class InputSystem {
  private static instance: InputSystem;
  private subscriptions: Subscription[] = [];
  private initialized: boolean = false;
  private enabled: boolean = false;
  
  private constructor() {
    // Private constructor for singleton
    console.log('InputSystem: Instance created');
  }
  
  public static getInstance(): InputSystem {
    if (!InputSystem.instance) {
      InputSystem.instance = new InputSystem();
    }
    return InputSystem.instance;
  }
  
  /**
   * Initialize the InputSystem and set up event listeners
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('InputSystem: Already initialized, skipping');
      return;
    }
    
    console.log('InputSystem: Initializing...');
    
    // Add jump event listener
    console.log('InputSystem: Registering JUMP event handler');
    inputManager.on(InputEvent.JUMP, this.handleJumpAction);

    // Add start game event listener
    console.log('InputSystem: Registering START_GAME event handler');
    inputManager.on(InputEvent.START_GAME, this.handleStartGame);
    
    // Add keyboard event listener for game start and debug mode
    console.log('InputSystem: Adding keydown event listener');
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Subscribe to game state changes to enable/disable input appropriately
    this.subscriptions.push(
      gameStateService.select(state => state.isGameOver).subscribe(isGameOver => {
        if (isGameOver) {
          console.log('InputSystem: Game over detected, disabling input');
          this.disable();
        }
      })
    );
    
    this.subscriptions.push(
      gameStateService.select(state => state.isStarted).subscribe(isStarted => {
        console.log(`InputSystem: isStarted changed to ${isStarted}`);
        if (isStarted) {
          console.log('InputSystem: Game started, enabling input');
          this.enable();
        } else {
          console.log('InputSystem: Game stopped, disabling input');
          this.disable();
        }
      })
    );
    
    this.initialized = true;
    console.log('InputSystem: Initialization complete');
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    console.log('InputSystem: Disposing...');
    
    // Remove input manager listeners
    inputManager.off(InputEvent.JUMP, this.handleJumpAction);
    inputManager.off(InputEvent.START_GAME, this.handleStartGame);
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Unsubscribe from all state changes
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    this.initialized = false;
    console.log('InputSystem: Disposed');
  }
  
  /**
   * Enable input processing
   */
  public enable(): void {
    inputManager.enable();
    this.enabled = true;
    console.log('InputSystem: Input enabled');
  }
  
  /**
   * Disable input processing
   */
  public disable(): void {
    inputManager.disable();
    this.enabled = false;
    console.log('InputSystem: Input disabled');
  }
  
  /**
   * Handle jump action from input manager
   */
  private handleJumpAction = (): void => {
    console.log(`InputSystem: Jump action received, enabled: ${this.enabled}`);
    if (!this.enabled) {
      console.log('InputSystem: Jump action ignored - input disabled');
      return;
    }
    
    // Dispatch jump event to the event bus
    console.log('InputSystem: Emitting JUMP_ACTION event');
    eventBus.emit(GameEvent.JUMP_ACTION, null);
  }

  private handleRestartGame = (): void => {
    console.log('InputSystem: Emitting RESTART_GAME event');
    eventBus.emit(GameEvent.RESTART_GAME, null);
  }
  
  /**
   * Handle start game action from input manager
   */
  private handleStartGame = (): void => {
    // No need to check if enabled - we want to allow game starting even when input is disabled
    console.log('InputSystem: START_GAME event received from InputManager');
    
    // Get current game state
    const gameState = gameStateService.getState();
    console.log(`InputSystem: Current game state - isStarted: ${gameState.isStarted}, isGameOver: ${gameState.isGameOver}`);
    
    // Only emit START_GAME if the game isn't already started
    if (!gameState.isStarted) {
      // Dispatch start game event to the event bus
      console.log('InputSystem: Emitting START_GAME event to EventBus');
      eventBus.emit(GameEvent.START_GAME, null);
    } else {
      console.log('InputSystem: Game already started, ignoring START_GAME event');
    }
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    console.log(`InputSystem: KeyDown event - ${e.key}, isStarted: ${gameStateService.getState().isStarted}`);
    
    // Handle spacebar for game start
    if (e.key === ' ' && !gameStateService.getState().isStarted) {
      console.log('InputSystem: Spacebar pressed while game not started, emitting START_GAME event directly');
      eventBus.emit(GameEvent.START_GAME, null);
    } 
    // Handle debug mode toggle
    else if (e.key === 'd' || e.key === 'D') {
      console.log('InputSystem: Debug mode toggle');
      gameStateService.toggleDebugMode();
    } else if (e.key === 'r' || e.key === 'R') {
      console.log('InputSystem: Restart game');
      eventBus.emit(GameEvent.RESTART_GAME, null);
    }
  }
}

// Export a default instance for convenient imports
export const inputSystem = InputSystem.getInstance(); 