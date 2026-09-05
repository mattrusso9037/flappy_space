import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameStateService, GameStateService } from './gameStateService';
import { eventBus, GameEvent } from './eventBus';
import { LEVELS } from './config';

describe('GameStateService', () => {
  beforeEach(() => {
    gameStateService.resetGame();
  });

  it('provides a singleton instance', () => {
    const instance = GameStateService.getInstance();
    expect(instance).toBe(gameStateService);
  });

  it('initializes with default Level 1 state', () => {
    const state = gameStateService.getState();
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);
    expect(state.warps).toBe(0);
    expect(state.time).toBe(0);
    expect(state.orbsCollected).toBe(0);
    expect(state.orbsRequired).toBe(LEVELS[0].orbsRequired);
    expect(state.timeLimit).toBe(LEVELS[0].timeLimit);
    expect(state.timeRemaining).toBe(LEVELS[0].timeLimit);
    expect(state.isStarted).toBe(false);
    expect(state.isGameOver).toBe(false);
    expect(state.isLevelComplete).toBe(false);
    expect(state.debugMode).toBe(false);
  });

  it('starts the game and emits GAME_STARTED event', () => {
    const handler = vi.fn();
    const sub = eventBus.on(GameEvent.GAME_STARTED).subscribe(handler);

    gameStateService.startGame();

    const state = gameStateService.getState();
    expect(state.isStarted).toBe(true);
    expect(state.isGameOver).toBe(false);
    expect(state.isLevelComplete).toBe(false);
    expect(handler).toHaveBeenCalled();

    sub.unsubscribe();
  });

  it('increments score correctly and emits SCORE_CHANGED event', () => {
    const scoreHandler = vi.fn();
    const sub = eventBus.on<number>(GameEvent.SCORE_CHANGED).subscribe(scoreHandler);

    gameStateService.incrementScore(50);
    expect(gameStateService.getState().score).toBe(50);

    gameStateService.incrementScore(25);
    expect(gameStateService.getState().score).toBe(75);

    expect(scoreHandler).toHaveBeenCalledWith(50);
    expect(scoreHandler).toHaveBeenCalledWith(75);

    sub.unsubscribe();
  });

  it('collects orbs, increases score by 10, and detects level completion threshold', () => {
    const orbHandler = vi.fn();
    const sub = eventBus.on<number>(GameEvent.ORB_COLLECTED).subscribe(orbHandler);

    const required = gameStateService.getState().orbsRequired;
    for (let i = 1; i < required; i++) {
      gameStateService.collectOrb();
      expect(gameStateService.getState().orbsCollected).toBe(i);
      expect(gameStateService.getState().isLevelComplete).toBe(false);
    }

    // Collecting the final required orb
    gameStateService.collectOrb();
    expect(gameStateService.getState().orbsCollected).toBe(required);
    expect(gameStateService.getState().isLevelComplete).toBe(true);
    expect(gameStateService.getState().score).toBe(required * 10);
    expect(orbHandler).toHaveBeenCalledWith(required);

    sub.unsubscribe();
  });

  it('transitions to next level on levelComplete()', () => {
    const levelHandler = vi.fn();
    const sub = eventBus.on<number>(GameEvent.LEVEL_CHANGED).subscribe(levelHandler);

    gameStateService.levelComplete();

    const state = gameStateService.getState();
    expect(state.level).toBe(2);
    expect(state.warps).toBe(1);
    expect(state.orbsCollected).toBe(0);
    expect(state.orbsRequired).toBe(LEVELS[1].orbsRequired);
    expect(state.timeLimit).toBe(LEVELS[1].timeLimit);
    expect(state.timeRemaining).toBe(LEVELS[1].timeLimit);
    expect(state.isLevelComplete).toBe(true);
    expect(levelHandler).toHaveBeenCalledWith(2);

    sub.unsubscribe();
  });

  it('marks game over when completing the maximum level', () => {
    // Progress through all levels
    for (let i = 1; i < LEVELS.length; i++) {
      gameStateService.levelComplete();
    }
    expect(gameStateService.getState().level).toBe(LEVELS.length);

    // Complete the final level
    gameStateService.levelComplete();
    expect(gameStateService.getState().isGameOver).toBe(true);
  });

  it('updates time, decrements timeRemaining, and triggers game over when time expires', () => {
    const timeHandler = vi.fn();
    const sub = eventBus.on(GameEvent.TIME_UPDATED).subscribe(timeHandler);

    gameStateService.updateTime(1000);
    expect(gameStateService.getState().time).toBe(1000);
    expect(gameStateService.getState().timeRemaining).toBe(LEVELS[0].timeLimit - 1000);
    expect(gameStateService.getState().isGameOver).toBe(false);

    // Advance time past limit
    gameStateService.updateTime(LEVELS[0].timeLimit);
    expect(gameStateService.getState().timeRemaining).toBe(0);
    expect(gameStateService.getState().isGameOver).toBe(true);
    expect(timeHandler).toHaveBeenCalled();

    sub.unsubscribe();
  });

  it('marks game over directly when gameOver() is called', () => {
    gameStateService.startGame();
    expect(gameStateService.getState().isStarted).toBe(true);

    gameStateService.gameOver();
    expect(gameStateService.getState().isGameOver).toBe(true);
    expect(gameStateService.getState().isStarted).toBe(false);
  });

  it('toggles debug mode and emits DEBUG_TOGGLED event', () => {
    const debugHandler = vi.fn();
    const sub = eventBus.on<boolean>(GameEvent.DEBUG_TOGGLED).subscribe(debugHandler);

    gameStateService.toggleDebugMode();
    expect(gameStateService.getState().debugMode).toBe(true);
    expect(debugHandler).toHaveBeenCalledWith(true);

    gameStateService.toggleDebugMode();
    expect(gameStateService.getState().debugMode).toBe(false);
    expect(debugHandler).toHaveBeenCalledWith(false);

    sub.unsubscribe();
  });

  it('notifies subscribers via select() on distinct value changes', () => {
    const scoreValues: number[] = [];
    const sub = gameStateService.select(s => s.score).subscribe(score => {
      scoreValues.push(score);
    });

    gameStateService.incrementScore(10);
    gameStateService.incrementScore(10);
    gameStateService.incrementScore(20);

    expect(scoreValues).toEqual([0, 10, 20, 40]);
    sub.unsubscribe();
  });
});
