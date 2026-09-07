import atlas from '../../../public/assets/astronaut/astronaut.json';
import walkingAtlas from '../../../public/assets/astronaut/astronaut-walking.json';
import stillAtlas from '../../../public/assets/astronaut/astronaut-still.json';
import { describe, it, expect, vi } from 'vitest';
import { Texture, AnimatedSprite, Sprite } from 'pixi.js';
import {
  getSpriteAnimation,
  getAllSpriteAnimations,
  registerSpriteAnimation,
  ASTRONAUT_SPRITE_DEFINITION,
  ASTRONAUT_WALKING_SPRITE_DEFINITION,
  ASTRONAUT_STILL_SPRITE_DEFINITION,
  resolveSpritePresentation,
  createAnimatedSprite,
} from './spriteAnimations';
import type { AssetManager } from '../assetManager';

describe('SpriteAnimations registry', () => {
  it('registers and retrieves the canonical astronaut animation definition', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def).toBeDefined();
    expect(def).toBe(ASTRONAUT_SPRITE_DEFINITION);
    expect(def?.id).toBe('astronaut');
    expect(def?.name).toBe('Astronaut Pilot');
    expect(def?.defaultAnimation).toBe('idle');
  });

  it('contains truthful canonical astronaut animation states (idle, thrust, walk, and still)', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def).toBeDefined();
    const anims = def!.animations;

    expect(anims.idle).toBeDefined();
    expect(anims.thrust).toBeDefined();
    expect(anims.walk).toBeDefined();
    expect(anims.walk_left).toBeDefined();
    expect(anims.still).toBeDefined();
    // Placeholder/fake states must not exist
    expect((anims as Record<string, unknown>).hit).toBeUndefined();
    expect((anims as Record<string, unknown>).death).toBeUndefined();
    expect((anims as Record<string, unknown>).warp).toBeUndefined();

    expect(anims.idle.loop).toBe(true);
    expect(anims.idle.fps).toBe(12);
    expect(anims.idle.frames).toHaveLength(8);

    expect(anims.thrust.loop).toBe(false);
    expect(anims.thrust.fps).toBe(18);
    expect(anims.thrust.frames).toHaveLength(9);
    expect(anims.thrust.frames[0]).toBe('idle_00');
    expect(anims.thrust.frames[anims.thrust.frames.length - 1]).toBe('idle_00');

    expect(anims.walk.loop).toBe(true);
    expect(anims.walk.fps).toBe(12);
    expect(anims.walk.frames).toHaveLength(8);

    expect(anims.walk_left.loop).toBe(true);
    expect(anims.walk_left.fps).toBe(12);
    expect(anims.walk_left.frames).toHaveLength(8);

    expect(anims.still.loop).toBe(true);
    expect(anims.still.fps).toBe(12);
    expect(anims.still.frames).toHaveLength(8);
    expect(anims.still.spritesheetAsset).toBe('astronaut-still');
  });

  it('registers and retrieves the canonical astronaut-still animation definition', () => {
    const def = getSpriteAnimation('astronaut-still');
    expect(def).toBeDefined();
    expect(def).toBe(ASTRONAUT_STILL_SPRITE_DEFINITION);
    expect(def?.id).toBe('astronaut-still');
    expect(def?.name).toBe('Astronaut Still');
    expect(def?.defaultAnimation).toBe('still');
    expect(def?.animations.still.frames).toHaveLength(8);
  });

  it('enforces fixed collision dimensions decoupled from visual frame sizes', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def?.collisionDimensions).toBeDefined();
    expect(def?.collisionDimensions?.width).toBe(35);
    expect(def?.collisionDimensions?.height).toBe(35);
  });

  it('declares canonical visual sizing metadata', () => {
    const def = getSpriteAnimation('astronaut');
    expect(def?.visualDimensions).toBeDefined();
    expect(def?.visualDimensions?.targetHeight).toBeCloseTo(95.48, 2);
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

describe('resolveSpritePresentation', () => {
  it('resolves textures, fps, and loop from a loaded spritesheet', () => {
    const mockTexture = Texture.WHITE;
    const textures: Record<string, Texture> = {};
    for (const frame of ASTRONAUT_SPRITE_DEFINITION.animations.idle.frames) {
      textures[frame] = mockTexture;
    }
    for (const frame of ASTRONAUT_SPRITE_DEFINITION.animations.thrust.frames) {
      textures[frame] = mockTexture;
    }
    for (const frame of ASTRONAUT_SPRITE_DEFINITION.animations.walk.frames) {
      textures[frame] = mockTexture;
    }
    for (const frame of ASTRONAUT_SPRITE_DEFINITION.animations.walk_left.frames) {
      textures[frame] = mockTexture;
    }

    const mockAssetManager = {
      getSpritesheet: vi.fn().mockImplementation((name: string) => {
        if (name === 'astronaut' || name === 'astronaut-walking') {
          return { textures };
        }
        return null;
      }),
      getTexture: vi.fn().mockReturnValue(mockTexture),
    } as unknown as AssetManager;

    const presentation = resolveSpritePresentation(mockAssetManager, ASTRONAUT_SPRITE_DEFINITION);
    expect(presentation.definition).toBe(ASTRONAUT_SPRITE_DEFINITION);
    expect(presentation.animations.idle).toBeDefined();
    expect(presentation.animations.idle.frames).toHaveLength(8);
    expect(presentation.animations.idle.fps).toBe(12);
    expect(presentation.animations.idle.loop).toBe(true);

    expect(presentation.animations.thrust).toBeDefined();
    expect(presentation.animations.thrust.frames).toHaveLength(9);
    expect(presentation.animations.thrust.fps).toBe(18);
    expect(presentation.animations.thrust.loop).toBe(false);

    expect(presentation.animations.walk).toBeDefined();
    expect(presentation.animations.walk.frames).toHaveLength(8);
    expect(presentation.animations.walk.fps).toBe(12);
    expect(presentation.animations.walk.loop).toBe(true);

    expect(presentation.animations.walk_left).toBeDefined();
    expect(presentation.animations.walk_left.frames).toHaveLength(8);
    expect(presentation.animations.walk_left.fps).toBe(12);
    expect(presentation.animations.walk_left.loop).toBe(true);
  });

  it('safely falls back when spritesheet is not loaded or unavailable', () => {
    const fallbackTexture = Texture.WHITE;
    const mockAssetManager = {
      getSpritesheet: vi.fn().mockReturnValue(null),
      getTexture: vi.fn().mockReturnValue(fallbackTexture),
    } as unknown as AssetManager;

    const presentation = resolveSpritePresentation(mockAssetManager, ASTRONAUT_SPRITE_DEFINITION);
    expect(presentation.definition).toBe(ASTRONAUT_SPRITE_DEFINITION);
    expect(Object.keys(presentation.animations)).toHaveLength(0);
    expect(presentation.fallbackTexture).toBe(fallbackTexture);
  });

  it('throws an error when a declared animation references missing frames in a loaded spritesheet', () => {
    const mockAssetManager = {
      getSpritesheet: vi.fn().mockReturnValue({
        textures: {
          idle_00: Texture.WHITE,
          // idle_01 is missing!
        },
      }),
      getTexture: vi.fn().mockReturnValue(Texture.WHITE),
    } as unknown as AssetManager;

    expect(() => resolveSpritePresentation(mockAssetManager, ASTRONAUT_SPRITE_DEFINITION)).toThrow(
      /missing in spritesheet/
    );
  });
});

describe('createAnimatedSprite', () => {
  it('creates a correctly configured AnimatedSprite from resolved presentation', () => {
    const frame = Texture.WHITE;
    const presentation = {
      definition: ASTRONAUT_SPRITE_DEFINITION,
      animations: {
        idle: {
          name: 'idle',
          frames: [frame, frame],
          fps: 3,
          loop: true,
        },
      },
    };

    const sprite = createAnimatedSprite(presentation, 'idle');
    expect(sprite).toBeInstanceOf(AnimatedSprite);
    const anim = sprite as AnimatedSprite;
    expect(anim.loop).toBe(true);
    expect(anim.animationSpeed).toBeCloseTo(3 / 60, 4);
    expect(anim.anchor.x).toBe(0.5);
    expect(anim.anchor.y).toBe(0.5);
  });

  it('creates a fallback static Sprite when animation frames are missing', () => {
    const presentation = {
      definition: ASTRONAUT_SPRITE_DEFINITION,
      animations: {},
      fallbackTexture: Texture.WHITE,
    };

    const sprite = createAnimatedSprite(presentation, 'idle');
    expect(sprite).toBeInstanceOf(Sprite);
    expect(sprite).not.toBeInstanceOf(AnimatedSprite);
    expect(sprite.anchor.x).toBe(0.5);
    expect(sprite.anchor.y).toBe(0.5);
  });
});

describe('production astronaut atlas', () => {
  it('matches the registered sequences and keeps every trimmed frame inside its source envelope', () => {
    expect(atlas.animations.idle).toEqual(ASTRONAUT_SPRITE_DEFINITION.animations.idle.frames);
    expect(atlas.animations.thrust).toEqual(ASTRONAUT_SPRITE_DEFINITION.animations.thrust.frames);
    for (const data of Object.values(atlas.frames)) {
      expect(data.sourceSize).toEqual({ w: data.frame.w, h: 341 });
      expect(data.spriteSourceSize.y).toBeGreaterThanOrEqual(0);
      expect(data.spriteSourceSize.y + data.spriteSourceSize.h).toBeLessThanOrEqual(341);
      expect(data.frame.y + data.frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
    }
  });
});

describe('production astronaut walking atlas', () => {
  it('matches the registered sequences and keeps every trimmed frame inside its source envelope', () => {
    expect(walkingAtlas.animations.walk).toEqual(ASTRONAUT_WALKING_SPRITE_DEFINITION.animations.walk.frames);
    expect(walkingAtlas.animations.walk_left).toEqual(ASTRONAUT_WALKING_SPRITE_DEFINITION.animations.walk_left.frames);
    for (const data of Object.values(walkingAtlas.frames)) {
      expect(data.sourceSize).toEqual({ w: 210, h: 290 });
      expect(data.spriteSourceSize.y).toBeGreaterThanOrEqual(0);
      expect(data.spriteSourceSize.y + data.spriteSourceSize.h).toBeLessThanOrEqual(290);
      expect(data.frame.y + data.frame.h).toBeLessThanOrEqual(walkingAtlas.meta.size.h);
      expect(data.frame.x + data.frame.w).toBeLessThanOrEqual(walkingAtlas.meta.size.w);
    }
  });
});

describe('production astronaut still atlas', () => {
  it('matches the registered sequences and keeps every trimmed frame inside its source envelope', () => {
    expect(stillAtlas.animations.still).toEqual(ASTRONAUT_STILL_SPRITE_DEFINITION.animations.still.frames);
    for (const data of Object.values(stillAtlas.frames)) {
      expect(data.sourceSize).toEqual({ w: 500, h: 691 });
      expect(data.spriteSourceSize.y).toBeGreaterThanOrEqual(0);
      expect(data.spriteSourceSize.y + data.spriteSourceSize.h).toBeLessThanOrEqual(691);
      expect(data.frame.y + data.frame.h).toBeLessThanOrEqual(stillAtlas.meta.size.h);
      expect(data.frame.x + data.frame.w).toBeLessThanOrEqual(stillAtlas.meta.size.w);
    }
  });
});
