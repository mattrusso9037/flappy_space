import { getLogger } from '../utils/logger';

const logger = getLogger('AudioManager');

export type SoundName =
  | 'jump'
  | 'thrust'
  | 'score'
  | 'orb'
  | 'hit'
  | 'gameOver'
  | 'levelUp'
  | 'launch'
  | 'caution';

export interface AudioManagerOptions {
  musicVolume?: number;
  sfxVolume?: number;
  isMuted?: boolean;
  musicUrl?: string;
}

/**
 * Resolves the URL for the background music track across web, Electron, and test environments.
 */
export function getDefaultMusicUrl(): string {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}music/Weightless%20Space.mp3`;
}

/**
 * AudioManager handles synthesis and playback of space sound effects via the Web Audio API
 * and streaming looped playback of "Weightless Space" background music.
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private sfxGainNode: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bgMusic: HTMLAudioElement | null = null;

  private initialized: boolean = false;
  private musicVolume: number = 0.35;
  private sfxVolume: number = 0.7;
  private isMuted: boolean = false;
  private musicUrl: string;
  private isMusicPlayingState: boolean = false;
  private unlockHandlerBound: (() => void) | null = null;

  public constructor(options?: AudioManagerOptions) {
    this.musicVolume = options?.musicVolume ?? 0.35;
    this.sfxVolume = options?.sfxVolume ?? 0.7;
    this.isMuted = options?.isMuted ?? false;
    this.musicUrl = options?.musicUrl ?? getDefaultMusicUrl();

    logger.debug('AudioManager constructed', {
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      isMuted: this.isMuted,
    });
  }

  /**
   * Initialize audio context, gain hierarchy, noise buffer, and background music.
   */
  public initialize(): void {
    if (this.initialized) return;

    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.context = new AudioCtx();

        this.sfxGainNode = this.context.createGain();
        this.sfxGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.context.currentTime);
        this.sfxGainNode.connect(this.context.destination);

        this.createNoiseBuffer();
      }

      this.initBackgroundMusic();
      this.attachAutoplayUnlock();

      this.initialized = true;
      logger.info('AudioManager initialized');
    } catch (error) {
      logger.error('Failed to initialize Web Audio API', error);
    }
  }

  /**
   * Initialize the HTML5 Audio element for background music streaming.
   */
  private initBackgroundMusic(): void {
    if (typeof window === 'undefined' || !window.Audio) return;

    try {
      this.bgMusic = new Audio(this.musicUrl);
      this.bgMusic.loop = true;
      this.bgMusic.volume = this.isMuted ? 0 : this.musicVolume;
      logger.debug('Background music initialized', { url: this.musicUrl });
    } catch (error) {
      logger.error('Failed to initialize background music', error);
    }
  }

  /**
   * Pre-generates a 1-second white noise buffer for crisp thruster puffs and collision impacts.
   */
  private createNoiseBuffer(): void {
    if (!this.context) return;
    const sampleRate = this.context.sampleRate || 44100;
    const bufferSize = sampleRate; // 1 second
    const buffer = this.context.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
  }

  /**
   * Listens for user gestures (click/keydown/touchstart) to resume suspended AudioContext
   * and unlock audio under modern browser autoplay policies.
   */
  private attachAutoplayUnlock(): void {
    if (typeof window === 'undefined') return;

    this.unlockHandlerBound = () => {
      this.resumeContext();
      if (this.isMusicPlayingState && this.bgMusic && this.bgMusic.paused && !this.isMuted) {
        this.bgMusic.play().catch(err => {
          logger.debug('Autoplay unlock music play rejected', err);
        });
      }
      this.detachAutoplayUnlock();
    };

    window.addEventListener('pointerdown', this.unlockHandlerBound, { once: true, passive: true });
    window.addEventListener('keydown', this.unlockHandlerBound, { once: true, passive: true });
    window.addEventListener('touchstart', this.unlockHandlerBound, { once: true, passive: true });
  }

  private detachAutoplayUnlock(): void {
    if (typeof window === 'undefined' || !this.unlockHandlerBound) return;
    window.removeEventListener('pointerdown', this.unlockHandlerBound);
    window.removeEventListener('keydown', this.unlockHandlerBound);
    window.removeEventListener('touchstart', this.unlockHandlerBound);
    this.unlockHandlerBound = null;
  }

  /**
   * Resume audio context if suspended by the browser.
   */
  public resumeContext(): void {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(err => {
        logger.debug('AudioContext resume failed', err);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Background Music Controls
  // ---------------------------------------------------------------------------

  /**
   * Start or resume playing the background music track ("Weightless Space").
   */
  public startMusic(): void {
    this.isMusicPlayingState = true;
    this.resumeContext();

    if (!this.bgMusic) {
      this.initBackgroundMusic();
    }

    if (this.bgMusic && !this.isMuted) {
      this.bgMusic.volume = this.musicVolume;
      const playPromise = this.bgMusic.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay policy prevented immediate playback; will unlock on first user gesture.
          logger.debug('Background music playback queued until user interaction', error);
        });
      }
    }
  }

  /**
   * Pause background music.
   */
  public pauseMusic(): void {
    this.isMusicPlayingState = false;
    if (this.bgMusic && !this.bgMusic.paused) {
      this.bgMusic.pause();
    }
  }

  /**
   * Stop background music and reset track position to the beginning.
   */
  public stopMusic(): void {
    this.isMusicPlayingState = false;
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }

  /**
   * Returns whether background music is actively playing.
   */
  public isMusicPlaying(): boolean {
    return Boolean(this.bgMusic && !this.bgMusic.paused);
  }

  /**
   * Returns the current background music URL.
   */
  public getMusicUrl(): string {
    return this.musicUrl;
  }

  /**
   * Switches the active background music track cleanly.
   * If the requested URL is identical to the current track, playback continues undisturbed.
   */
  public setMusicTrack(trackUrl: string): void {
    if (this.musicUrl === trackUrl) {
      return;
    }

    logger.info('Switching music track', { from: this.musicUrl, to: trackUrl });
    const wasPlaying = this.isMusicPlayingState;

    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
      this.bgMusic = null;
    }

    this.musicUrl = trackUrl;
    this.initBackgroundMusic();

    if (wasPlaying && !this.isMuted) {
      this.startMusic();
    }
  }

  // ---------------------------------------------------------------------------
  // Volume & Mute Controls
  // ---------------------------------------------------------------------------

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic && !this.isMuted) {
      this.bgMusic.volume = this.musicVolume;
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGainNode && this.context && !this.isMuted) {
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.context.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (this.bgMusic) {
      this.bgMusic.volume = muted ? 0 : this.musicVolume;
      if (!muted && this.isMusicPlayingState && this.bgMusic.paused) {
        this.bgMusic.play().catch(() => {});
      }
    }

    if (this.sfxGainNode && this.context) {
      this.sfxGainNode.gain.setValueAtTime(muted ? 0 : this.sfxVolume, this.context.currentTime);
    }

    logger.info(`Audio ${muted ? 'muted' : 'unmuted'}`);
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }

  // ---------------------------------------------------------------------------
  // Leveled-Up Synthesized Sound Effects
  // ---------------------------------------------------------------------------

  /**
   * Generic trigger helper mapped to specific synthesizer routines.
   */
  public play(soundName: SoundName): void {
    switch (soundName) {
      case 'jump':
      case 'thrust':
        this.playThrust();
        break;
      case 'orb':
        this.playOrb();
        break;
      case 'score':
        this.playScore();
        break;
      case 'hit':
        this.playHit();
        break;
      case 'gameOver':
        this.playGameOver();
        break;
      case 'levelUp':
        this.playLevelUp();
        break;
      case 'launch':
        this.playLaunch();
        break;
      case 'caution':
        this.playCaution();
        break;
    }
  }

  /**
   * Astronaut Jetpack Pulse (Flap/Jump):
   * Pitched triangle/sine sweep (160Hz -> 320Hz) with an authentic pressurized gas noise puff.
   */
  public playThrust(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    // 1. Tonal jetpack impulse
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode!);
    osc.start(now);
    osc.stop(now + 0.16);

    // 2. High-pressure gas hiss (filtered noise burst)
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(2.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGainNode!);
      noise.start(now);
      noise.stop(now + 0.09);
    }
  }

  /**
   * Celestial Crystal Shimmer (Orb Collection):
   * Dual harmonic bell tones (E6 1318.5Hz and B6 1975.5Hz gliding upward) with a sparkling decay.
   */
  public playOrb(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    const frequencies = [1318.5, 1975.5];
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.33, now + 0.28);

      const peakGain = idx === 0 ? 0.24 : 0.16;
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(now + idx * 0.015);
      osc.stop(now + 0.33);
    });
  }

  /**
   * Doppler Gate Chime (Obstacle Passed):
   * Warm resonant chime (440Hz -> 554Hz) that rewards successful clearance without sonic fatigue.
   */
  public playScore(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGainNode!);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Hull Impact Crunch (Collision):
   * Heavy punchy downward sub-bass thud combined with lowpass-filtered noise explosion.
   */
  public playHit(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    // 1. Low punch thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode!);
    osc.start(now);
    osc.stop(now + 0.23);

    // 2. Crunch impact noise
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.24);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGainNode!);
      noise.start(now);
      noise.stop(now + 0.26);
    }
  }

  /**
   * Telemetry Power-Down (Game Over / Signal Lost):
   * Descending detuned oscillators with closing filter sweep representing suit system shutdown.
   */
  public playGameOver(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    const freqs = [380, 372];
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.65);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + 0.65);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(now);
      osc.stop(now + 0.66);
    });
  }

  /**
   * Hyperdrive Warp Arpeggio (Level Complete):
   * Ascending 5-note celestial arpeggio (F5 -> A5 -> C6 -> E6 -> A6) with resonant shimmer.
   */
  public playLevelUp(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    const notes = [698.46, 880.0, 1046.5, 1318.5, 1760.0];
    const noteStep = 0.07;

    notes.forEach((freq, index) => {
      const noteTime = now + index * noteStep;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0005, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.46);
    });
  }

  /**
   * Flight Systems Online (Game Launch):
   * Ascending pitch charge sweep (180Hz -> 650Hz).
   */
  public playLaunch(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.22);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGainNode!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Cockpit Caution Ping (Low Time Alert):
   * High-tech 880Hz sonar warning beep.
   */
  public playCaution(): void {
    if (!this.canPlaySfx()) return;
    const ctx = this.context!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGainNode!);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Disposes audio resources, halts background music, and detaches listeners.
   */
  public dispose(): void {
    this.stopMusic();
    this.detachAutoplayUnlock();

    if (this.context && this.context.state !== 'closed') {
      try {
        this.context.close().catch(() => {});
      } catch (err) {
        logger.debug('Error closing AudioContext', err);
      }
    }

    this.context = null;
    this.sfxGainNode = null;
    this.noiseBuffer = null;
    this.bgMusic = null;
    this.initialized = false;
    logger.info('AudioManager disposed');
  }

  private canPlaySfx(): boolean {
    if (this.isMuted || !this.context || !this.sfxGainNode) return false;
    this.resumeContext();
    return true;
  }
}

// Export a singleton instance for backward compatibility
const audioManager = new AudioManager();
export default audioManager;