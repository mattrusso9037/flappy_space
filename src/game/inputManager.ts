// Input keys
import { getLogger } from '../utils/logger';

const logger = getLogger('InputManager');

export enum InputKey {
  SPACE = 'Space',
  ARROW_UP = 'ArrowUp',
  W = 'KeyW',
}

// Input events
export enum InputEvent {
  JUMP = 'jump',
  START_GAME = 'start_game',
  TOUCH = 'touch', // Add a specific touch event
}

// Event handler type
type EventHandler = () => void;

// Touch data type for additional touch information
export interface TouchData {
  x: number;
  y: number;
  timestamp: number;
}

class InputManager {
  private keyMap: Map<InputKey, boolean>;
  private eventHandlers: Map<InputEvent, EventHandler[]>;
  private enabled: boolean;
  private touchActive: boolean = false;
  private lastTouchTime: number = 0;
  private touchThrottleTime: number = 150; // ms between touch events

  constructor() {
    this.keyMap = new Map();
    this.eventHandlers = new Map();
    this.enabled = false;

    // Initialize handlers for all input events
    Object.values(InputEvent).forEach(event => {
      this.eventHandlers.set(event, []);
    });
    
    logger.info('Created');
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
    logger.info('Enabled with keyboard and touch support');
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
    logger.info('Disabled');
  }

  /**
   * Register an event handler
   */
  on(event: InputEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    logger.debug(`Registered handler for ${event}, total handlers: ${handlers.length}`);
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
      logger.debug(`Unregistered handler for ${event}, remaining handlers: ${handlers.length}`);
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
    logger.debug(`KeyDown event - ${key}, enabled: ${this.enabled}`);
    
    // If key wasn't already down, trigger events
    if (!this.keyMap.get(key)) {
      this.keyMap.set(key, true);
      
      // Trigger jump event on relevant keys
      if (key === InputKey.SPACE || key === InputKey.ARROW_UP || key === InputKey.W) {
        logger.debug(`Triggering JUMP event from key ${key}`);
        this.triggerEvent(InputEvent.JUMP);
        
        // Also trigger start game if space is pressed
        if (key === InputKey.SPACE) {
          logger.debug('Triggering START_GAME event from spacebar');
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
    logger.debug(`KeyUp event - ${key}`);
  };

  /**
   * Handle touch start events (equivalent to keydown)
   */
  private handleTouchStart = (event: TouchEvent): void => {
    if (!this.enabled) {
      logger.debug('Touch ignored - input disabled');
      return;
    }
    
    const now = Date.now();
    // Throttle touch events to prevent multiple rapid fires
    if (now - this.lastTouchTime < this.touchThrottleTime) {
      logger.debug('Touch throttled - too soon after last touch');
      event.preventDefault();
      return;
    }
    
    this.lastTouchTime = now;
    
    // Get touch coordinates
    const touch = event.touches[0];
    const touchData: TouchData = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: now
    };
    
    logger.debug(`TouchStart event at (${touchData.x}, ${touchData.y})`);
    
    // Mark touch as active
    this.touchActive = true;
    
    // Always trigger the START_GAME event first
    logger.debug('Triggering START_GAME event from touch');
    this.triggerEvent(InputEvent.START_GAME);
    
    // Then trigger the TOUCH event with touch data
    logger.debug('Triggering TOUCH event');
    this.triggerEventWithData(InputEvent.TOUCH, touchData);
    
    // Finally trigger JUMP for gameplay
    logger.debug('Triggering JUMP event from touch');
    this.triggerEvent(InputEvent.JUMP);
    
    // Prevent default behavior to avoid scrolling
    event.preventDefault();
  };

  /**
   * Handle touch end events (equivalent to keyup)
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    logger.debug('TouchEnd event detected');
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
    logger.debug(`Triggering ${event} event, handlers: ${handlers.length}`);
    handlers.forEach(handler => handler());
  }
  
  /**
   * Trigger an input event with additional data
   */
  private triggerEventWithData(event: InputEvent, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    logger.debug(`Triggering ${event} event with data, handlers: ${handlers.length}`);
    // Since we don't have a way to pass data to handlers directly,
    // we'll store it temporarily as a property
    (this as any).lastEventData = data;
    handlers.forEach(handler => handler());
    delete (this as any).lastEventData;
  }
  
  /**
   * Get the last event data (for touch events)
   */
  getLastEventData(): any {
    return (this as any).lastEventData;
  }
  
  /**
   * Manually trigger a start game event
   * This can be called from UI components directly
   */
  triggerStartGame(): void {
    logger.debug('Manual START_GAME trigger');
    this.triggerEvent(InputEvent.START_GAME);
  }
}

// Create singleton instance
const inputManager = new InputManager();
export default inputManager; 