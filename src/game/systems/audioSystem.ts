import { Subscription } from 'rxjs';
import { EventBus, GameEvent, TimeUpdatedData } from '../eventBus';
import audioManager, { AudioManager } from '../audio';
import { getLogger } from '../../utils/logger';

const logger = getLogger('AudioSystem');

/**
 * AudioSystem manages audio playback in response to game events.
 * It coordinates sound effects synthesis and background music based on the event stream.
 */
export class AudioSystem {
  private subscriptions: Subscription[] = [];
  private initialized: boolean = false;
  private readonly events: EventBus;
  private readonly audioMgr: AudioManager;
  private lastCautionSecond: number | null = null;

  public constructor(
    events: EventBus,
    audioMgr: AudioManager = audioManager
  ) {
    this.events = events;
    this.audioMgr = audioMgr;
  }

  /**
   * Initialize the AudioSystem, audio manager, and event listeners.
   */
  public initialize(): void {
    if (this.initialized) return;

    this.audioMgr.initialize();
    this.setupEventListeners();
    this.initialized = true;

    logger.info('AudioSystem initialized');
  }

  /**
   * Clean up resources and subscriptions when the system is disposed.
   */
  public dispose(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.lastCautionSecond = null;
    this.audioMgr.dispose();
    this.initialized = false;

    logger.info('AudioSystem disposed');
  }

  /**
   * Setup listeners for typed game events to trigger sound effects and music.
   */
  private setupEventListeners(): void {
    // 1. Jump / Astronaut Thruster Flap
    this.subscriptions.push(
      this.events.on(GameEvent.JUMP_ACTION).subscribe(() => {
        logger.debug('Triggering thruster sound');
        this.audioMgr.playThrust();
      })
    );

    // 2. Obstacle Passed (Score increment)
    this.subscriptions.push(
      this.events.on(GameEvent.OBSTACLE_PASSED).subscribe(() => {
        logger.debug('Triggering gate score sound');
        this.audioMgr.playScore();
      })
    );

    // 3. Celestial Orb Collected
    this.subscriptions.push(
      this.events.on(GameEvent.ORB_COLLECTED).subscribe(() => {
        logger.debug('Triggering orb collection chime');
        this.audioMgr.playOrb();
      })
    );

    // 4. Collision Impact
    this.subscriptions.push(
      this.events.on(GameEvent.COLLISION_DETECTED).subscribe(() => {
        logger.debug('Triggering hull impact sound');
        this.audioMgr.playHit();
      })
    );

    // 5. Game Over / Signal Lost
    this.subscriptions.push(
      this.events.on(GameEvent.GAME_OVER).subscribe(() => {
        logger.debug('Triggering game over power-down sound');
        this.audioMgr.playGameOver();
        this.audioMgr.pauseMusic();
      })
    );

    // 6. Level Complete / Warp Engagement
    this.subscriptions.push(
      this.events.on(GameEvent.LEVEL_COMPLETE).subscribe(() => {
        logger.debug('Triggering hyperdrive warp arpeggio');
        this.audioMgr.playLevelUp();
      })
    );

    // 7. Mission Launch / Start
    this.subscriptions.push(
      this.events.on(GameEvent.START_GAME).subscribe(() => {
        logger.debug('Triggering flight launch sound & starting music');
        this.audioMgr.playLaunch();
        this.audioMgr.startMusic();
        this.lastCautionSecond = null;
      })
    );

    // 8. Session Started
    this.subscriptions.push(
      this.events.on(GameEvent.GAME_STARTED).subscribe(() => {
        this.audioMgr.startMusic();
      })
    );

    // 9. Session Reset / Restart
    this.subscriptions.push(
      this.events.on(GameEvent.RESTART_GAME).subscribe(() => {
        this.lastCautionSecond = null;
        this.audioMgr.startMusic();
      })
    );

    // 10. Low Time Caution Pulse
    this.subscriptions.push(
      this.events.on(GameEvent.TIME_UPDATED).subscribe((data: TimeUpdatedData) => {
        if (!data || typeof data.timeRemaining !== 'number') return;
        if (data.timeRemaining <= 5000 && data.timeRemaining > 0) {
          const second = Math.ceil(data.timeRemaining / 1000);
          if (this.lastCautionSecond !== second) {
            this.lastCautionSecond = second;
            logger.debug(`Low time caution ping: ${second}s remaining`);
            this.audioMgr.playCaution();
          }
        } else {
          this.lastCautionSecond = null;
        }
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Public Control API
  // ---------------------------------------------------------------------------

  public toggleMute(): boolean {
    return this.audioMgr.toggleMute();
  }

  public setMuted(muted: boolean): void {
    this.audioMgr.setMuted(muted);
  }

  public isMuted(): boolean {
    return this.audioMgr.isAudioMuted();
  }

  public setMusicVolume(volume: number): void {
    this.audioMgr.setMusicVolume(volume);
  }

  public setSfxVolume(volume: number): void {
    this.audioMgr.setSfxVolume(volume);
  }

  public startMusic(): void {
    this.audioMgr.startMusic();
  }

  public pauseMusic(): void {
    this.audioMgr.pauseMusic();
  }

  public resumeMusic(): void {
    this.audioMgr.startMusic();
  }

  public stopMusic(): void {
    this.audioMgr.stopMusic();
  }

  public getAudioManager(): AudioManager {
    return this.audioMgr;
  }
}