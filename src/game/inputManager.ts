// Input keys
export enum InputKey {
  SPACE = 'Space',
  ARROW_UP = 'ArrowUp',
  W = 'KeyW',
}

// Input events
export enum InputEvent {
  JUMP = 'jump',
  START_GAME = 'start_game',
}

// Event handler type
type EventHandler = () => void;

class InputManager {
  private keyMap: Map<InputKey, boolean>;
  private eventHandlers: Map<InputEvent, EventHandler[]>;
  private enabled: boolean;

  constructor() {
    this.keyMap = new Map();
    this.eventHandlers = new Map();
    this.enabled = false;

    // Initialize handlers for all input events
    Object.values(InputEvent).forEach(event => {
      this.eventHandlers.set(event, []);
    });
    
    console.log('InputManager: Created');
  }

  /**
   * Enable input handling
   */
  enable(): void {
    if (this.enabled) return;
    
    // Set up keyboard listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    this.enabled = true;
    console.log('InputManager: Enabled');
  }

  /**
   * Disable input handling
   */
  disable(): void {
    if (!this.enabled) return;
    
    // Remove keyboard listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    this.enabled = false;
    console.log('InputManager: Disabled');
  }

  /**
   * Register an event handler
   */
  on(event: InputEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    console.log(`InputManager: Registered handler for ${event}, total handlers: ${handlers.length}`);
  }

  /**
   * Unregister an event handler
   */
  off(event: InputEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
      console.log(`InputManager: Unregistered handler for ${event}, remaining handlers: ${handlers.length}`);
    }
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyDown(key: InputKey): boolean {
    return this.keyMap.get(key) || false;
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.code as InputKey;
    console.log(`InputManager: KeyDown event - ${key}, enabled: ${this.enabled}`);
    
    // If key wasn't already down, trigger events
    if (!this.keyMap.get(key)) {
      this.keyMap.set(key, true);
      
      // Trigger jump event on relevant keys
      if (key === InputKey.SPACE || key === InputKey.ARROW_UP || key === InputKey.W) {
        console.log(`InputManager: Triggering JUMP event from key ${key}`);
        this.triggerEvent(InputEvent.JUMP);
        
        // Also trigger start game if space is pressed
        // Note: The problem might be that we're only triggering JUMP and not START_GAME
        if (key === InputKey.SPACE) {
          console.log('InputManager: Triggering START_GAME event from spacebar');
          this.triggerEvent(InputEvent.START_GAME);
        }
      }
    }
  };

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.code as InputKey;
    this.keyMap.set(key, false);
    console.log(`InputManager: KeyUp event - ${key}`);
  };

  /**
   * Trigger an input event
   */
  private triggerEvent(event: InputEvent): void {
    const handlers = this.eventHandlers.get(event) || [];
    console.log(`InputManager: Triggering ${event} event, handlers: ${handlers.length}`);
    handlers.forEach(handler => handler());
  }
}

// Create singleton instance
const inputManager = new InputManager();
export default inputManager; 