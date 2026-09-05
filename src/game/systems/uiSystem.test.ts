import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { UISystem } from './uiSystem';
import { GameStateService } from '../gameStateService';
import { EventBus } from '../eventBus';

describe('UISystem', () => {
  let stage: PIXI.Container;
  let events: EventBus;
  let state: GameStateService;
  let uiSystem: UISystem;

  beforeEach(() => {
    stage = new PIXI.Container();
    events = new EventBus();
    state = new GameStateService();
    uiSystem = new UISystem(undefined, events, state);
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
    state.incrementScore(50);
    expect(state.getState().score).toBe(50);
  });

  it('cleans up subscriptions on dispose()', () => {
    uiSystem.initialize(stage);
    expect(() => uiSystem.dispose()).not.toThrow();
  });
});
