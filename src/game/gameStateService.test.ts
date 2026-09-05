import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateService } from './gameStateService';
import { LEVELS } from './config';

describe('GameStateService', () => {
  let stateService: GameStateService;

  beforeEach(() => {
    stateService = new GameStateService();
  });

  it('isolates separate state service instances', () => {
    const state1 = new GameStateService();
    const state2 = new GameStateService();

    state1.incrementScore(100);
    expect(state1.getState().score).toBe(100);
    expect(state2.getState().score).toBe(0);
  });

  it('initializes with default Level 1 state', () => {
    const state = stateService.getState();
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

  it('starts the game and updates state flags', () => {
    stateService.startGame();

    const state = stateService.getState();
    expect(state.isStarted).toBe(true);
    expect(state.isGameOver).toBe(false);
    expect(state.isLevelComplete).toBe(false);
  });

  it('increments score correctly', () => {
    stateService.incrementScore(50);
    expect(stateService.getState().score).toBe(50);

    stateService.incrementScore(25);
    expect(stateService.getState().score).toBe(75);
  });

  it('collects orbs, increases score by ORB_POINTS (50), and detects level completion threshold', () => {
    const required = stateService.getState().orbsRequired;
    for (let i = 1; i < required; i++) {
      stateService.collectOrb();
      expect(stateService.getState().orbsCollected).toBe(i);
      expect(stateService.getState().isLevelComplete).toBe(false);
    }

    // Collecting the final required orb
    stateService.collectOrb();
    expect(stateService.getState().orbsCollected).toBe(required);
    expect(stateService.getState().isLevelComplete).toBe(true);
    expect(stateService.getState().score).toBe(required * 50);
  });

  it('transitions to next level on levelComplete()', () => {
    stateService.levelComplete();

    const state = stateService.getState();
    expect(state.level).toBe(2);
    expect(state.warps).toBe(1);
    expect(state.orbsCollected).toBe(0);
    expect(state.orbsRequired).toBe(LEVELS[1].orbsRequired);
    expect(state.timeLimit).toBe(LEVELS[1].timeLimit);
    expect(state.timeRemaining).toBe(LEVELS[1].timeLimit);
    expect(state.isLevelComplete).toBe(true);
  });

  it('marks game over when completing the maximum level', () => {
    // Progress through all levels
    for (let i = 1; i < LEVELS.length; i++) {
      stateService.levelComplete();
    }
    expect(stateService.getState().level).toBe(LEVELS.length);

    // Complete the final level
    stateService.levelComplete();
    expect(stateService.getState().isGameOver).toBe(true);
  });

  it('updates time, decrements timeRemaining, and triggers game over when time expires', () => {
    stateService.updateTime(1000);
    expect(stateService.getState().time).toBe(1000);
    expect(stateService.getState().timeRemaining).toBe(LEVELS[0].timeLimit - 1000);
    expect(stateService.getState().isGameOver).toBe(false);

    // Advance time past limit
    stateService.updateTime(LEVELS[0].timeLimit);
    expect(stateService.getState().timeRemaining).toBe(0);
    expect(stateService.getState().isGameOver).toBe(true);
  });

  it('marks game over directly when gameOver() is called', () => {
    stateService.startGame();
    expect(stateService.getState().isStarted).toBe(true);

    stateService.gameOver();
    expect(stateService.getState().isGameOver).toBe(true);
    expect(stateService.getState().isStarted).toBe(false);
  });

  it('toggles debug mode', () => {
    stateService.toggleDebugMode();
    expect(stateService.getState().debugMode).toBe(true);

    stateService.toggleDebugMode();
    expect(stateService.getState().debugMode).toBe(false);
  });

  it('notifies subscribers via select() on distinct value changes', () => {
    const scoreValues: number[] = [];
    const sub = stateService.select((s: { score: number }) => s.score).subscribe(score => {
      scoreValues.push(score);
    });

    stateService.incrementScore(10);
    stateService.incrementScore(10);
    stateService.incrementScore(20);

    expect(scoreValues).toEqual([0, 10, 20, 40]);
    sub.unsubscribe();
  });
});
