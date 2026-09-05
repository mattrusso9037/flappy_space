import { EventBus, eventBus, GameEvent } from '../eventBus';
import audioManager from '../audio';
import { Subscription } from 'rxjs';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AudioSystem');

/**
 * AudioSystem manages audio playback in response to game events.
 * It subscribes to the EventBus to receive notifications about game state changes.
 */
export class AudioSystem {
  private static instance: AudioSystem;
  private subscriptions: Subscription[] = [];
  private initialized: boolean = false;
  private readonly events: EventBus;
  private readonly audioMgr: typeof audioManager;
  
  public constructor(
    events: EventBus = eventBus,
    audioMgr: typeof audioManager = audioManager
  ) {
    this.events = events;
    this.audioMgr = audioMgr;
  }
  
  public static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }
  
  /**
   * Initialize the AudioSystem and subscribe to game events
   */
  public initialize(): void {
    if (this.initialized) return;
    
    this.audioMgr.initialize();
    this.setupEventListeners();
    this.initialized = true;
    
    logger.info('AudioSystem initialized');
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    // Unsubscribe from all events
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.initialized = false;
    
    logger.info('AudioSystem disposed');
  }
  
  /**
   * Setup listeners for various game events to trigger sound effects
   */
  private setupEventListeners(): void {
    // Add a subscription for jump action
    this.subscriptions.push(
      this.events.on(GameEvent.JUMP_ACTION).subscribe(() => {
        logger.debug('Playing jump sound');
        this.audioMgr.play('jump');
      })
    );
    
    // Add a subscription for scoring (obstacle passed)
    this.subscriptions.push(
      this.events.on(GameEvent.OBSTACLE_PASSED).subscribe(() => {
        logger.debug('Playing score sound');
        this.audioMgr.play('score');
      })
    );
    
    // Add a subscription for orb collection
    this.subscriptions.push(
      this.events.on(GameEvent.ORB_COLLECTED).subscribe(() => {
        logger.debug('Playing orb collection sound');
        this.audioMgr.play('score'); // Reusing score sound for now
      })
    );
    
    // Add a subscription for collision detection
    this.subscriptions.push(
      this.events.on(GameEvent.COLLISION_DETECTED).subscribe(() => {
        logger.debug('Playing hit sound');
        this.audioMgr.play('hit');
      })
    );
    
    // Add a subscription for game over
    this.subscriptions.push(
      this.events.on(GameEvent.GAME_OVER).subscribe(() => {
        logger.debug('Playing game over sound');
        this.audioMgr.play('hit'); // Reusing hit sound for now
      })
    );
    
    // Add a subscription for level completion
    this.subscriptions.push(
      this.events.on(GameEvent.LEVEL_COMPLETE).subscribe(() => {
        logger.debug('Playing level complete sound');
        this.audioMgr.play('levelUp');
      })
    );
  }
}

// Export a default instance for convenient imports
export const audioSystem = AudioSystem.getInstance();