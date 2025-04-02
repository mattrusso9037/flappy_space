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
  private touchActive: boolean = false;

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
    
    // Set up touch listeners
    window.addEventListener('touchstart', this.handleTouchStart);
    window.addEventListener('touchend', this.handleTouchEnd);
    // Prevent default touch behavior to avoid scrolling, zooming, etc.
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    
    this.enabled = true;
    console.log('InputManager: Enabled with keyboard and touch support');
  }

  /**
   * Disable input handling
   */
  disable(): void {
    if (!this.enabled) return;
    
    // Remove keyboard listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    // Remove touch listeners
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchmove', this.handleTouchMove);
    
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
   * Check if touch is currently active
   */
  isTouchActive(): boolean {
    return this.touchActive;
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
   * Handle touch start events (equivalent to keydown)
   */
  private handleTouchStart = (event: TouchEvent): void => {
    if (!this.enabled) return;
    
    console.log('InputManager: TouchStart event detected');
    
    // Mark touch as active
    this.touchActive = true;
    
    // Trigger the jump event
    console.log('InputManager: Triggering JUMP event from touch');
    this.triggerEvent(InputEvent.JUMP);
    
    // Also trigger start game event
    console.log('InputManager: Triggering START_GAME event from touch');
    this.triggerEvent(InputEvent.START_GAME);
    
    // Prevent default behavior to avoid scrolling
    event.preventDefault();
  };

  /**
   * Handle touch end events (equivalent to keyup)
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    console.log('InputManager: TouchEnd event detected');
    this.touchActive = false;
    
    // Prevent default behavior
    event.preventDefault();
  };

  /**
   * Handle touch move events to prevent scrolling
   */
  private handleTouchMove = (event: TouchEvent): void => {
    // Prevent scrolling while touching the game
    event.preventDefault();
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