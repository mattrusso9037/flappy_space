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
    if (this.initialized) return;
    
    // Add jump event listener
    inputManager.on(InputEvent.JUMP, this.handleJumpAction);
    
    // Add keyboard event listener for game start and debug mode
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Subscribe to game state changes to enable/disable input appropriately
    this.subscriptions.push(
      gameStateService.select(state => state.isGameOver).subscribe(isGameOver => {
        if (isGameOver) {
          this.disable();
        }
      })
    );
    
    this.subscriptions.push(
      gameStateService.select(state => state.isStarted).subscribe(isStarted => {
        if (isStarted) {
          this.enable();
        } else {
          this.disable();
        }
      })
    );
    
    this.initialized = true;
    console.log('InputSystem initialized');
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    // Remove input manager listeners
    inputManager.off(InputEvent.JUMP, this.handleJumpAction);
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Unsubscribe from all state changes
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    this.initialized = false;
    console.log('InputSystem disposed');
  }
  
  /**
   * Enable input processing
   */
  public enable(): void {
    inputManager.enable();
    this.enabled = true;
    console.log('InputSystem enabled');
  }
  
  /**
   * Disable input processing
   */
  public disable(): void {
    inputManager.disable();
    this.enabled = false;
    console.log('InputSystem disabled');
  }
  
  /**
   * Handle jump action from input manager
   */
  private handleJumpAction = (): void => {
    if (!this.enabled) return;
    
    // Dispatch jump event to the event bus
    eventBus.publish(GameEvent.JUMP_ACTION, null);
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Handle spacebar for game start
    if (e.key === ' ' && !gameStateService.getState().isStarted) {
      gameStateService.startGame();
    } 
    // Handle debug mode toggle
    else if (e.key === 'd' || e.key === 'D') {
      gameStateService.toggleDebugMode();
    }
  }
}

// Export a default instance for convenient imports
export const inputSystem = InputSystem.getInstance(); 