import { describe, it, expect } from 'vitest';
import {
  getSpriteAnimation,
  getAllSpriteAnimations,
  registerSpriteAnimation,
  ASTRONAUT_SPRITE_DEFINITION,
} from './spriteAnimations';

describe('SpriteAnimations registry', () => {
  it('registers and retrieves the canonical astronaut animation definition', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def).toBeDefined();
    expect(def).toBe(ASTRONAUT_SPRITE_DEFINITION);
    expect(def?.id).toBe('astronaut');
    expect(def?.name).toBe('Astronaut Pilot');
    expect(def?.defaultAnimation).toBe('idle');
  });

  it('contains all expected canonical astronaut animation states', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def).toBeDefined();
    const anims = def!.animations;

    expect(anims.idle).toBeDefined();
    expect(anims.thrust).toBeDefined();
    expect(anims.hit).toBeDefined();
    expect(anims.death).toBeDefined();
    expect(anims.warp).toBeDefined();

    expect(anims.idle.loop).toBe(false);
    expect(anims.thrust.loop).toBe(false);
    expect(anims.hit.loop).toBe(false);
    expect(anims.death.loop).toBe(false);
    expect(anims.warp.loop).toBe(true);

    // Frame rates must be positive numbers
    for (const [key, state] of Object.entries(anims)) {
      expect(state.fps, `FPS for ${key} must be > 0`).toBeGreaterThan(0);
      expect(state.frames.length, `Frames for ${key} must not be empty`).toBeGreaterThan(0);
    }
  });

  it('enforces fixed collision dimensions decoupled from visual frame sizes', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def?.collisionDimensions).toBeDefined();
    expect(def?.collisionDimensions?.width).toBe(35);
    expect(def?.collisionDimensions?.height).toBe(35);
  });

  it('allows registering and retrieving custom sprite asset definitions', () => {
    registerSpriteAnimation({
      id: 'scout-drone',
      name: 'Scout Drone NPC',
      spritesheetAsset: 'scout-drone',
      defaultAnimation: 'idle',
      animations: {
        idle: {
          frames: ['drone_00', 'drone_01'],
          fps: 6,
          loop: true,
        },
      },
      collisionDimensions: { width: 24, height: 24 },
    });

    const drone = getSpriteAnimation('scout-drone');
    expect(drone).toBeDefined();
    expect(drone?.name).toBe('Scout Drone NPC');
    expect(drone?.animations.idle.frames).toHaveLength(2);

    const all = getAllSpriteAnimations();
    expect(all.some(a => a.id === 'scout-drone')).toBe(true);
  });

  it('gracefully handles registration of empty id', () => {
    registerSpriteAnimation({
      id: '',
      name: 'Bad Sprite',
      spritesheetAsset: 'bad',
      defaultAnimation: 'idle',
      animations: {},
    });
    expect(getSpriteAnimation('')).toBeUndefined();
  });
});
