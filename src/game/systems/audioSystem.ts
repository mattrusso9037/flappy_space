import { eventBus, GameEvent } from '../eventBus';
import audioManager from '../audio';
import { Subscription } from 'rxjs';

/**
 * AudioSystem manages audio playback in response to game events.
 * It subscribes to the EventBus to receive notifications about game state changes.
 */
export class AudioSystem {
  private static instance: AudioSystem;
  private subscriptions: Subscription[] = [];
  private initialized: boolean = false;
  
  private constructor() {
    // Private constructor for singleton
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
    
    audioManager.initialize();
    this.setupEventListeners();
    this.initialized = true;
    
    console.log('AudioSystem initialized');
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    // Unsubscribe from all events
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.initialized = false;
    
    console.log('AudioSystem disposed');
  }
  
  /**
   * Setup listeners for various game events to trigger sound effects
   */
  private setupEventListeners(): void {
    // Add a subscription for jump action
    this.subscriptions.push(
      eventBus.on(GameEvent.JUMP_ACTION).subscribe(() => {
        console.log('Playing jump sound');
        audioManager.play('jump');
      })
    );
    
    // Add a subscription for scoring (obstacle passed)
    this.subscriptions.push(
      eventBus.on(GameEvent.OBSTACLE_PASSED).subscribe(() => {
        console.log('Playing score sound');
        audioManager.play('score');
      })
    );
    
    // Add a subscription for orb collection
    this.subscriptions.push(
      eventBus.on(GameEvent.ORB_COLLECTED).subscribe(() => {
        console.log('Playing orb collection sound');
        audioManager.play('score'); // Reusing score sound for now
      })
    );
    
    // Add a subscription for collision detection
    this.subscriptions.push(
      eventBus.on(GameEvent.COLLISION_DETECTED).subscribe(() => {
        console.log('Playing hit sound');
        audioManager.play('hit');
      })
    );
    
    // Add a subscription for game over
    this.subscriptions.push(
      eventBus.on(GameEvent.GAME_OVER).subscribe(() => {
        console.log('Playing game over sound');
        audioManager.play('hit'); // Reusing hit sound for now
      })
    );
    
    // Add a subscription for level completion
    this.subscriptions.push(
      eventBus.on(GameEvent.LEVEL_COMPLETE).subscribe(() => {
        console.log('Playing level complete sound');
        audioManager.play('levelUp');
      })
    );
  }
}

// Export a default instance for convenient imports
export const audioSystem = AudioSystem.getInstance(); 