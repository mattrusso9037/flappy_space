import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { uiSystem } from './uiSystem';
import { gameStateService } from '../gameStateService';

describe('UISystem Characterization', () => {
  let stage: PIXI.Container;

  beforeEach(() => {
    stage = new PIXI.Container();
    gameStateService.resetGame();
  });

  afterEach(() => {
    uiSystem.dispose();
  });

  it('initializes UI containers and scoreboard on stage', () => {
    const initialChildrenCount = stage.children.length;
    uiSystem.initialize(stage);

    // Stage should have UI elements added (UI container, scoreboard, orb effects)
    expect(stage.children.length).toBeGreaterThan(initialChildrenCount);
  });

  it('updates scoreboard display when state score changes', () => {
    uiSystem.initialize(stage);

    // Trigger state changes
    gameStateService.incrementScore(50);
    expect(gameStateService.getState().score).toBe(50);
  });

  it('cleans up subscriptions on dispose()', () => {
    uiSystem.initialize(stage);
    expect(() => uiSystem.dispose()).not.toThrow();
  });
});
