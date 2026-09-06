import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, GameEvent } from '../eventBus';
import { AudioSystem } from './audioSystem';
import { AudioManager } from '../audio';

describe('AudioSystem', () => {
  let events: EventBus;
  let audioManager: AudioManager;
  let audioSystem: AudioSystem;

  beforeEach(() => {
    events = new EventBus();
    audioManager = new AudioManager();
    audioSystem = new AudioSystem(events, audioManager);
  });

  afterEach(() => {
    audioSystem.dispose();
  });

  it('initializes and configures listeners idempotently', () => {
    const spyInit = vi.spyOn(audioManager, 'initialize');
    audioSystem.initialize();
    audioSystem.initialize();

    expect(spyInit).toHaveBeenCalledTimes(1);
  });

  it('triggers thrust sound on JUMP_ACTION event', () => {
    const spy = vi.spyOn(audioManager, 'playThrust').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.JUMP_ACTION, null);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('triggers score chime on OBSTACLE_PASSED event', () => {
    const spy = vi.spyOn(audioManager, 'playScore').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.OBSTACLE_PASSED, null);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('triggers crystalline orb chime on ORB_COLLECTED event', () => {
    const spy = vi.spyOn(audioManager, 'playOrb').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.ORB_COLLECTED, { x: 100, y: 150 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('triggers impact crunch on COLLISION_DETECTED event', () => {
    const spy = vi.spyOn(audioManager, 'playHit').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.COLLISION_DETECTED, null);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('triggers power-down and pauses music on GAME_OVER event', () => {
    const spyGameOver = vi.spyOn(audioManager, 'playGameOver').mockImplementation(() => {});
    const spyPauseMusic = vi.spyOn(audioManager, 'pauseMusic').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.GAME_OVER, { reason: 'collision' });
    expect(spyGameOver).toHaveBeenCalledTimes(1);
    expect(spyPauseMusic).toHaveBeenCalledTimes(1);
  });

  it('triggers hyperdrive warp arpeggio on LEVEL_COMPLETE event', () => {
    const spy = vi.spyOn(audioManager, 'playLevelUp').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.LEVEL_COMPLETE, { level: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('triggers launch sound and starts music on START_GAME and GAME_STARTED events', () => {
    const spyLaunch = vi.spyOn(audioManager, 'playLaunch').mockImplementation(() => {});
    const spyStartMusic = vi.spyOn(audioManager, 'startMusic').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.START_GAME, null);
    expect(spyLaunch).toHaveBeenCalledTimes(1);
    expect(spyStartMusic).toHaveBeenCalledTimes(1);

    events.emit(GameEvent.GAME_STARTED, null);
    expect(spyStartMusic).toHaveBeenCalledTimes(2);
  });

  it('starts music on RESTART_GAME event', () => {
    const spy = vi.spyOn(audioManager, 'startMusic').mockImplementation(() => {});
    audioSystem.initialize();

    events.emit(GameEvent.RESTART_GAME, null);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('plays caution ping once per second when timeRemaining <= 5s', () => {
    const spyCaution = vi.spyOn(audioManager, 'playCaution').mockImplementation(() => {});
    audioSystem.initialize();

    // > 5000ms: no caution ping
    events.emit(GameEvent.TIME_UPDATED, { timeRemaining: 6000 });
    expect(spyCaution).not.toHaveBeenCalled();

    // 4800ms -> 5s second mark: 1 ping
    events.emit(GameEvent.TIME_UPDATED, { timeRemaining: 4800 });
    expect(spyCaution).toHaveBeenCalledTimes(1);

    // 4500ms -> still in 5s mark: should not re-ping within the same second
    events.emit(GameEvent.TIME_UPDATED, { timeRemaining: 4500 });
    expect(spyCaution).toHaveBeenCalledTimes(1);

    // 3800ms -> 4s second mark: 2nd ping
    events.emit(GameEvent.TIME_UPDATED, { timeRemaining: 3800 });
    expect(spyCaution).toHaveBeenCalledTimes(2);

    // 0ms or below: no caution ping
    events.emit(GameEvent.TIME_UPDATED, { timeRemaining: 0 });
    expect(spyCaution).toHaveBeenCalledTimes(2);
  });

  it('forwards mute and volume controls to audioManager', () => {
    audioSystem.initialize();

    expect(audioSystem.isMuted()).toBe(false);

    const muted = audioSystem.toggleMute();
    expect(muted).toBe(true);
    expect(audioSystem.isMuted()).toBe(true);

    audioSystem.setMuted(false);
    expect(audioSystem.isMuted()).toBe(false);

    const spyMusicVol = vi.spyOn(audioManager, 'setMusicVolume');
    const spySfxVol = vi.spyOn(audioManager, 'setSfxVolume');

    audioSystem.setMusicVolume(0.4);
    expect(spyMusicVol).toHaveBeenCalledWith(0.4);

    audioSystem.setSfxVolume(0.8);
    expect(spySfxVol).toHaveBeenCalledWith(0.8);
  });

  it('forwards music control methods', () => {
    const spyStart = vi.spyOn(audioManager, 'startMusic').mockImplementation(() => {});
    const spyPause = vi.spyOn(audioManager, 'pauseMusic').mockImplementation(() => {});
    const spyStop = vi.spyOn(audioManager, 'stopMusic').mockImplementation(() => {});

    audioSystem.initialize();

    audioSystem.startMusic();
    expect(spyStart).toHaveBeenCalled();

    audioSystem.pauseMusic();
    expect(spyPause).toHaveBeenCalled();

    audioSystem.resumeMusic();
    expect(spyStart).toHaveBeenCalledTimes(2);

    audioSystem.stopMusic();
    expect(spyStop).toHaveBeenCalled();
  });

  it('stops listening to events and disposes audioManager on dispose', () => {
    const spyThrust = vi.spyOn(audioManager, 'playThrust').mockImplementation(() => {});
    const spyDispose = vi.spyOn(audioManager, 'dispose');

    audioSystem.initialize();
    audioSystem.dispose();

    expect(spyDispose).toHaveBeenCalledTimes(1);

    // Emitting after dispose should not trigger audio
    events.emit(GameEvent.JUMP_ACTION, null);
    expect(spyThrust).not.toHaveBeenCalled();
  });
});
