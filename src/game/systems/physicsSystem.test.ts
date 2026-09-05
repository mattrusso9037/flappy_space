import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { PhysicsSystem } from './physicsSystem';
import { EntitySystem } from './entitySystem';
import { GameStateService } from '../gameStateService';
import { EventBus } from '../eventBus';
import { Astronaut } from '../entities/Astronaut';
import { Orb } from '../entities/Orb';

describe('PhysicsSystem', () => {
  let mockApp: PIXI.Application;
  let events: EventBus;
  let state: GameStateService;
  let entities: EntitySystem;
  let physics: PhysicsSystem;

  beforeEach(() => {
    mockApp = {
      stage: new PIXI.Container(),
    } as unknown as PIXI.Application;

    events = new EventBus();
    state = new GameStateService();
    entities = new EntitySystem(mockApp, undefined, events);
    entities.initialize(mockApp);
    physics = new PhysicsSystem(entities, state, events);
    physics.initialize();
  });

  afterEach(() => {
    physics.dispose();
    entities.dispose();
  });

  it('initializes and configures scroll speed without throwing', () => {
    expect(() => physics.setScrollSpeed(2.5)).not.toThrow();
  });

  it('skips updates when game is not started', () => {
    const astronaut = new Astronaut(PIXI.Texture.EMPTY, 200, 300);
    // Directly add astronaut to entity manager
    (entities as unknown as { astronaut: Astronaut }).astronaut = astronaut;

    const initialY = astronaut.sprite.y;
    physics.update(0.016, [astronaut]);

    // Astronaut should not have moved because isStarted is false
    expect(astronaut.sprite.y).toBe(initialY);
  });

  it('demonstrates current orb collision score mutation seam', () => {
    state.startGame();
    const initialScore = state.getState().score;

    // Create astronaut and orb at colliding positions
    const astronaut = new Astronaut(PIXI.Texture.EMPTY, 300, 200);
    const orb = new Orb(300, 200, 20, 2);

    (entities as unknown as { astronaut: Astronaut }).astronaut = astronaut;
    (entities as unknown as { orbs: Orb[] }).orbs = [orb];

    physics.update(0.016, [astronaut, orb]);

    // Verify consolidated single-source score mutation:
    // A collected orb awards ORB_POINTS (50) exactly once via state.collectOrb()
    const finalScore = state.getState().score;
    expect(orb.collected).toBe(true);
    expect(finalScore - initialScore).toBe(50);
  });
});
