import { EventBus, GameEvent } from '../eventBus';
import { GameStateService } from '../gameStateService';
import { InputManager, InputEvent, TouchData, Direction } from '../inputManager';
import { EntitySystem } from './entitySystem';
import { Subscription } from 'rxjs';
import { getLogger } from '../../utils/logger';

const logger = getLogger('InputSystem');

/**
 * InputSystem processes user input and dispatches game events.
 * It abstracts the low-level input handling from the game logic.
 */
export class InputSystem {
  private subscriptions: Subscription[] = [];
  private initialized: boolean = false;
  private enabled: boolean = false;
  private inTransition: boolean = false;
  private lastTouchCoordinates: { x: number, y: number } | null = null;
  private readonly events: EventBus;
  private readonly state: GameStateService;
  private readonly inputMgr: InputManager;
  private readonly entities: EntitySystem;
  
  public constructor(
    events: EventBus,
    state: GameStateService,
    inputMgr: InputManager,
    entities: EntitySystem
  ) {
    this.events = events;
    this.state = state;
    this.inputMgr = inputMgr;
    this.entities = entities;
    logger.info('Instance created');
  }
  
  /**
   * Initialize the InputSystem and set up event listeners
   */
  public initialize(): void {
    if (this.initialized) {
      logger.warn('Already initialized, skipping');
      return;
    }
    
    logger.info('Initializing...');
    
    // Add jump event listener
    logger.debug('Registering JUMP event handler');
    this.inputMgr.on(InputEvent.JUMP, this.handleJumpAction);

    // Add movement event listeners
    logger.debug('Registering directional movement handlers');
    this.inputMgr.on(InputEvent.MOVE_UP, this.handleMoveUpAction);
    this.inputMgr.on(InputEvent.MOVE_DOWN, this.handleMoveDownAction);
    this.inputMgr.on(InputEvent.MOVE_LEFT, this.handleMoveLeftAction);
    this.inputMgr.on(InputEvent.MOVE_RIGHT, this.handleMoveRightAction);

    // Add start game event listener
    logger.debug('Registering START_GAME event handler');
    this.inputMgr.on(InputEvent.START_GAME, this.handleStartGame);
    
    // Add touch event listener
    logger.debug('Registering TOUCH event handler');
    this.inputMgr.on(InputEvent.TOUCH, this.handleTouchAction);
    
    // Add keyboard event listener for game start and debug mode
    logger.debug('Adding keydown event listener');
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Subscribe to game state changes to enable/disable input appropriately
    this.subscriptions.push(
      this.state.select(state => state.isGameOver).subscribe(isGameOver => {
        if (isGameOver) {
          logger.info('Game over detected, disabling input');
          this.disable();
        }
      })
    );
    
    this.subscriptions.push(
      this.state.select(state => state.isStarted).subscribe(isStarted => {
        logger.debug(`isStarted changed to ${isStarted}`);
        if (isStarted) {
          logger.info('Game started, enabling input');
          this.enable();
        } else {
          logger.info('Game stopped, disabling input');
          this.disable();
        }
      })
    );
    
    this.initialized = true;
    logger.info('Initialization complete');
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    logger.info('Disposing...');
    
    // Remove input manager listeners
    this.inputMgr.off(InputEvent.JUMP, this.handleJumpAction);
    this.inputMgr.off(InputEvent.MOVE_UP, this.handleMoveUpAction);
    this.inputMgr.off(InputEvent.MOVE_DOWN, this.handleMoveDownAction);
    this.inputMgr.off(InputEvent.MOVE_LEFT, this.handleMoveLeftAction);
    this.inputMgr.off(InputEvent.MOVE_RIGHT, this.handleMoveRightAction);
    this.inputMgr.off(InputEvent.START_GAME, this.handleStartGame);
    this.inputMgr.off(InputEvent.TOUCH, this.handleTouchAction);
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Dispose input manager
    this.inputMgr.dispose();
    
    // Unsubscribe from all state changes
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    this.initialized = false;
    logger.info('Disposed');
  }
  
  /**
   * Enable input processing
   */
  public enable(): void {
    this.inputMgr.enable();
    this.enabled = true;
    logger.info('Input enabled');
  }
  
  /**
   * Disable input processing
   */
  public disable(): void {
    this.inputMgr.disable();
    this.enabled = false;
    logger.info('Input disabled');
  }
  
  /**
   * Handle jump action from input manager
   */
  private handleJumpAction = (): void => {
    logger.debug(`Jump action received, enabled: ${this.enabled}`);
    if (!this.enabled) {
      logger.debug('Jump action ignored - input disabled');
      return;
    }
    
    // Dispatch jump event to the event bus
    logger.debug('Emitting JUMP_ACTION event');
    this.events.emit(GameEvent.JUMP_ACTION, null);
    this.entities.getAstronaut()?.thrust();
  }

  /**
   * Handle move up action from input manager
   */
  private handleMoveUpAction = (): void => {
    logger.debug(`Move up action received, enabled: ${this.enabled}`);
    if (!this.enabled) {
      logger.debug('Move up action ignored - input disabled');
      return;
    }
    
    // Dispatch move up event to the event bus
    logger.debug('Emitting MOVE_UP_ACTION event');
    this.events.emit(GameEvent.MOVE_UP_ACTION, null);
    this.entities.getAstronaut()?.moveUp();
  }

  /**
   * Handle move down action from input manager
   */
  private handleMoveDownAction = (): void => {
    logger.debug(`Move down action received, enabled: ${this.enabled}`);
    if (!this.enabled) {
      logger.debug('Move down action ignored - input disabled');
      return;
    }
    
    // Dispatch move down event to the event bus
    logger.debug('Emitting MOVE_DOWN_ACTION event');
    this.events.emit(GameEvent.MOVE_DOWN_ACTION, null);
    this.entities.getAstronaut()?.moveDown();
  }

  /**
   * Handle move left action from input manager
   */
  private handleMoveLeftAction = (): void => {
    logger.debug(`Move left action received, enabled: ${this.enabled}`);
    if (!this.enabled) {
      logger.debug('Move left action ignored - input disabled');
      return;
    }
    
    // Dispatch move left event to the event bus
    logger.debug('Emitting MOVE_LEFT_ACTION event');
    this.events.emit(GameEvent.MOVE_LEFT_ACTION, null);
    this.entities.getAstronaut()?.moveLeft();
  }

  /**
   * Handle move right action from input manager
   */
  private handleMoveRightAction = (): void => {
    logger.debug(`Move right action received, enabled: ${this.enabled}`);
    if (!this.enabled) {
      logger.debug('Move right action ignored - input disabled');
      return;
    }
    
    // Dispatch move right event to the event bus
    logger.debug('Emitting MOVE_RIGHT_ACTION event');
    this.events.emit(GameEvent.MOVE_RIGHT_ACTION, null);
    this.entities.getAstronaut()?.moveRight();
  }

  /**
   * Handle touch action from input manager
   */
  private handleTouchAction = (): void => {
    // Get touch data from input manager
    const touchData = this.inputMgr.getLastEventData() as TouchData;
    if (!touchData) {
      logger.warn('Touch event received without touch data');
      return;
    }
    
    logger.debug(`Touch action at (${touchData.x}, ${touchData.y})`);
    this.lastTouchCoordinates = { x: touchData.x, y: touchData.y };
    
    // We don't need to check if enabled for this because
    // touch events should work even when the game isn't started
    
    // The actual jump will be triggered by the JUMP event separately
    // This handler just captures touch coordinates for potential future use
  }

  private handleRestartGame = (): void => {
    logger.info('Emitting RESTART_GAME event');
    this.events.emit(GameEvent.RESTART_GAME, null);
  }
  
  /**
   * Handle start game action from input manager
   */
  private handleStartGame = (): void => {
    // No need to check if enabled - we want to allow game starting even when input is disabled
    logger.debug('START_GAME event received from InputManager');
    
    this.startOrResetGame();
  }
  
  /**
   * Start or reset the game based on current state
   * This provides a unified entry point for all game flow control
   */
  public startOrResetGame(): boolean {
    // Prevent multiple rapid calls
    if (this.inTransition) {
      logger.info('Game transition already in progress, ignoring request');
      return false;
    }

    // Get current game state
    const state = this.state.getState();
    logger.info(`Current game state - isStarted: ${state.isStarted}, isGameOver: ${state.isGameOver}`);
    
    try {
      this.inTransition = true;
      
      // If game is over, reset everything first
      if (state.isGameOver) {
        logger.info('Game was over - emitting RESTART_GAME and START_GAME events');
        this.events.emit(GameEvent.RESTART_GAME, null);
        this.events.emit(GameEvent.START_GAME, null);
        this.inTransition = false;
        return true;
      } 
      // If game is not started and not in game over state, just start it
      else if (!state.isStarted) {
        logger.info('Starting new game');
        this.events.emit(GameEvent.START_GAME, null);
        this.inTransition = false;
        return true;
      }
      
      // Game is already in progress
      this.inTransition = false;
      return false;
    } catch (error) {
      logger.error(`Error controlling game: ${error}`);
      this.inTransition = false;
      return false;
    }
  }
  
  /**
   * Handle game click/tap events 
   * This is typically called from the GameDisplay component
   */
  public handleGameClick = (): void => {
    logger.debug('Game area clicked/tapped');
    this.startOrResetGame();
  }
  
  /**
   * Handle direct touch events from outside the input manager
   * This can be used by other components when they need to trigger
   * touch events directly without going through the input manager
   */
  public handleDirectTouch = (x: number, y: number): void => {
    logger.debug(`Direct touch at (${x}, ${y})`);
    this.lastTouchCoordinates = { x, y };
    
    // If not in gameplay yet, attempt to start the game
    if (!this.state.getState().isStarted || this.state.getState().isGameOver) {
      logger.info('Direct touch triggering game start');
      this.startOrResetGame();
    } else {
      // Otherwise trigger a jump
      logger.debug('Direct touch triggering jump in active game');
      this.events.emit(GameEvent.JUMP_ACTION, null);
      this.entities.getAstronaut()?.thrust();
    }
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    logger.debug(`KeyDown event - ${e.key}, isStarted: ${this.state.getState().isStarted}`);
    
    // Handle spacebar for game start/reset
    if (e.key === ' ' || e.code === 'Space') {
      const state = this.state.getState();
      if (!state.isStarted || state.isGameOver) {
        logger.info('Spacebar pressed - starting or resetting game');
        this.startOrResetGame();
      }
    } 

    // Handle debug mode toggle
    else if (e.key === 'd' || e.key === 'D') {
      logger.info('Debug mode toggle');
      this.state.toggleDebugMode();
    } else if (e.key === 'r' || e.key === 'R') {
      logger.info('Restart game');
      this.events.emit(GameEvent.RESTART_GAME, null);
    }
  }
  
  /**
   * Get the current directional input state
   * This can be used by systems that need continuous input rather than events
   */
  public getDirectionalInput(): Record<Direction, boolean> {
    return this.inputMgr.getDirectionalInput();
  }
  
  /**
   * Get the last touch coordinates
   */
  public getLastTouchCoordinates(): { x: number, y: number } | null {
    return this.lastTouchCoordinates;
  }
} 