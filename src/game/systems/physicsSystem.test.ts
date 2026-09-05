import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { physicsSystem } from './physicsSystem';
import { entityManager } from './entitySystem';
import { gameStateService } from '../gameStateService';
import { Astronaut } from '../entities/Astronaut';
import { Orb } from '../entities/Orb';

describe('PhysicsSystem Characterization', () => {
  let mockApp: PIXI.Application;

  beforeEach(() => {
    mockApp = {
      stage: new PIXI.Container(),
    } as unknown as PIXI.Application;

    entityManager.initialize(mockApp);
    physicsSystem.initialize();
    gameStateService.resetGame();
  });

  afterEach(() => {
    physicsSystem.dispose();
    entityManager.dispose();
  });

  it('initializes and configures scroll speed without throwing', () => {
    expect(() => physicsSystem.setScrollSpeed(2.5)).not.toThrow();
  });

  it('skips updates when game is not started', () => {
    const astronaut = new Astronaut(PIXI.Texture.EMPTY, 200, 300);
    // Directly add astronaut to entity manager
    // @ts-expect-error - characterization access
    entityManager.astronaut = astronaut;

    const initialY = astronaut.sprite.y;
    physicsSystem.update(0.016);

    // Astronaut should not have moved because isStarted is false
    expect(astronaut.sprite.y).toBe(initialY);
  });

  it('demonstrates current orb collision score mutation seam', () => {
    gameStateService.startGame();
    const initialScore = gameStateService.getState().score;

    // Create astronaut and orb at colliding positions
    const astronaut = new Astronaut(PIXI.Texture.EMPTY, 300, 200);
    const orb = new Orb(300, 200, 20, 2);

    // @ts-expect-error - characterization access
    entityManager.astronaut = astronaut;
    // @ts-expect-error - characterization access
    entityManager.orbs = [orb];

    physicsSystem.update(0.016);

    // Verify consolidated single-source score mutation:
    // A collected orb awards ORB_POINTS (50) exactly once via state.collectOrb()
    const finalScore = gameStateService.getState().score;
    expect(orb.collected).toBe(true);
    expect(finalScore - initialScore).toBe(50);
  });
});
