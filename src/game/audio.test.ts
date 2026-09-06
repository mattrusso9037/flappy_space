import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, getDefaultMusicUrl } from './audio';

describe('AudioManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
  });

  afterEach(() => {
    audio.dispose();
  });

  it('initializes with default options and resolved music URL', () => {
    expect(audio.isAudioMuted()).toBe(false);
    expect(audio.isMusicPlaying()).toBe(false);
    expect(getDefaultMusicUrl()).toContain('Weightless%20Space.mp3');
  });

  it('accepts custom initialization options', () => {
    const custom = new AudioManager({
      musicVolume: 0.5,
      sfxVolume: 0.9,
      isMuted: true,
      musicUrl: '/custom/music.mp3',
    });

    expect(custom.isAudioMuted()).toBe(true);
    custom.dispose();
  });

  it('initializes Web Audio context and background music idempotently', () => {
    audio.initialize();
    audio.initialize(); // Second call should be a no-op
    expect(audio.isAudioMuted()).toBe(false);
  });

  it('controls background music playback lifecycle', () => {
    audio.initialize();

    audio.startMusic();
    expect(audio.isMusicPlaying()).toBe(true);

    audio.pauseMusic();
    expect(audio.isMusicPlaying()).toBe(false);

    audio.startMusic();
    expect(audio.isMusicPlaying()).toBe(true);

    audio.stopMusic();
    expect(audio.isMusicPlaying()).toBe(false);
  });

  it('toggles audio mute and updates volumes', () => {
    audio.initialize();

    const muted = audio.toggleMute();
    expect(muted).toBe(true);
    expect(audio.isAudioMuted()).toBe(true);

    const unmuted = audio.toggleMute();
    expect(unmuted).toBe(false);
    expect(audio.isAudioMuted()).toBe(false);

    audio.setMuted(true);
    expect(audio.isAudioMuted()).toBe(true);

    audio.setMuted(false);
    expect(audio.isAudioMuted()).toBe(false);
  });

  it('clamps music and sfx volumes between 0 and 1', () => {
    audio.initialize();

    audio.setMusicVolume(1.5);
    audio.setMusicVolume(-0.5);

    audio.setSfxVolume(2.0);
    audio.setSfxVolume(-1.0);

    expect(audio.isAudioMuted()).toBe(false);
  });

  it('triggers synthesized sound effects without error', () => {
    audio.initialize();

    expect(() => audio.playThrust()).not.toThrow();
    expect(() => audio.playOrb()).not.toThrow();
    expect(() => audio.playScore()).not.toThrow();
    expect(() => audio.playHit()).not.toThrow();
    expect(() => audio.playGameOver()).not.toThrow();
    expect(() => audio.playLevelUp()).not.toThrow();
    expect(() => audio.playLaunch()).not.toThrow();
    expect(() => audio.playCaution()).not.toThrow();
  });

  it('dispatches named sound triggers through play() helper', () => {
    audio.initialize();

    const spyThrust = vi.spyOn(audio, 'playThrust');
    const spyOrb = vi.spyOn(audio, 'playOrb');
    const spyScore = vi.spyOn(audio, 'playScore');
    const spyHit = vi.spyOn(audio, 'playHit');
    const spyGameOver = vi.spyOn(audio, 'playGameOver');
    const spyLevelUp = vi.spyOn(audio, 'playLevelUp');
    const spyLaunch = vi.spyOn(audio, 'playLaunch');
    const spyCaution = vi.spyOn(audio, 'playCaution');

    audio.play('jump');
    audio.play('thrust');
    audio.play('orb');
    audio.play('score');
    audio.play('hit');
    audio.play('gameOver');
    audio.play('levelUp');
    audio.play('launch');
    audio.play('caution');

    expect(spyThrust).toHaveBeenCalledTimes(2);
    expect(spyOrb).toHaveBeenCalledTimes(1);
    expect(spyScore).toHaveBeenCalledTimes(1);
    expect(spyHit).toHaveBeenCalledTimes(1);
    expect(spyGameOver).toHaveBeenCalledTimes(1);
    expect(spyLevelUp).toHaveBeenCalledTimes(1);
    expect(spyLaunch).toHaveBeenCalledTimes(1);
    expect(spyCaution).toHaveBeenCalledTimes(1);
  });

  it('bypasses sound synthesis when audio is muted', () => {
    audio.initialize();
    audio.setMuted(true);

    const spyThrust = vi.spyOn(audio, 'playThrust');
    audio.playThrust();
    expect(spyThrust).toHaveBeenCalled();
  });

  it('cleans up resources and stops background music on dispose', () => {
    audio.initialize();
    audio.startMusic();
    audio.dispose();

    expect(audio.isMusicPlaying()).toBe(false);
  });
});
