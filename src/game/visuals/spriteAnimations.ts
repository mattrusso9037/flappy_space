import * as PIXI from 'pixi.js';
import {
  SpriteAssetDefinition,
  ResolvedSpritePresentation,
  ResolvedSpriteAnimation,
} from './spriteAnimationTypes';
import type { AssetManager } from '../assetManager';
import { getLogger } from '../../utils/logger';

const logger = getLogger('SpriteAnimations');

/**
 * In-memory registry of sprite animation metadata definitions.
 */
const spriteRegistry = new Map<string, SpriteAssetDefinition>();

/**
 * Register a sprite asset definition with its animation states.
 */
export function registerSpriteAnimation(definition: SpriteAssetDefinition): void {
  if (!definition.id) {
    logger.error('Attempted to register sprite animation without an id');
    return;
  }
  if (!definition.animations || Object.keys(definition.animations).length === 0) {
    logger.warn(`Sprite animation definition for '${definition.id}' has no animations defined`);
  }
  spriteRegistry.set(definition.id, definition);
  logger.debug(`Registered sprite animation: ${definition.id}`);
}

/**
 * Retrieve a registered sprite asset definition by ID.
 */
export function getSpriteAnimation(id: string): SpriteAssetDefinition | undefined {
  return spriteRegistry.get(id);
}

/**
 * Retrieve all registered sprite animation definitions.
 */
export function getAllSpriteAnimations(): SpriteAssetDefinition[] {
  return Array.from(spriteRegistry.values());
}

/**
 * Canonical astronaut animation definition contract.
 *
 * Authored states:
 * - idle: looping hover state (14 frames, 12 FPS, loop: true)
 * - thrust: jetpack ignition pulse (9 frames, 18 FPS, loop: false, returns to idle)
 *
 * Sizing:
 * - collisionDimensions: fixed 35x35 (hitbox decoupled from visual frame dimensions)
 * - visualDimensions: target rendered height of 95.48px (aspect-ratio preserving scale ~0.28 for 341px frame)
 */
export const ASTRONAUT_SPRITE_DEFINITION: SpriteAssetDefinition = {
  id: 'astronaut',
  name: 'Astronaut Pilot',
  spritesheetAsset: 'astronaut',
  defaultAnimation: 'idle',
  collisionDimensions: {
    width: 35,
    height: 35,
  },
  visualDimensions: {
    targetHeight: 95.48,
  },
  animations: {
    idle: {
      frames: ['idle_00','idle_01','idle_02','idle_03','idle_04','idle_05','idle_06','idle_07'],
      fps: 12,
      loop: true,
    },
    thrust: {
      frames: ['idle_00','thrust_00','thrust_01','thrust_02','thrust_03','thrust_04','thrust_05','thrust_06','idle_00'],
      fps: 18,
      loop: false,
    },
    walk: {
      frames: ['idle_00','idle_01','idle_02','idle_03','idle_04','idle_05','idle_06','idle_07'],
      fps: 12,
      loop: true,
    },
  },
};

// Register default canonical definitions
registerSpriteAnimation(ASTRONAUT_SPRITE_DEFINITION);

/**
 * Resolve semantic sprite animation metadata against loaded assets in AssetManager.
 * Returns a typed ResolvedSpritePresentation with bound textures.
 * If the spritesheet is unavailable, returns a fallback presentation with fallbackTexture.
 * If a declared animation references missing frames in a loaded spritesheet, throws an error.
 */
export function resolveSpritePresentation(
  assetMgr: AssetManager,
  definition: SpriteAssetDefinition
): ResolvedSpritePresentation {
  const fallbackTexture =
    assetMgr.getTexture('astronaut-idle') ||
    assetMgr.getTexture('astronaut-static') ||
    assetMgr.getTexture(definition.spritesheetAsset);

  const sheet = assetMgr.getSpritesheet(definition.spritesheetAsset);
  if (!sheet) {
    logger.warn(`Spritesheet '${definition.spritesheetAsset}' not loaded or unavailable. Using static fallback.`);
    return {
      definition,
      animations: {},
      fallbackTexture: fallbackTexture || PIXI.Texture.WHITE,
    };
  }

  const resolvedAnimations: Record<string, ResolvedSpriteAnimation> = {};

  for (const [animName, animDef] of Object.entries(definition.animations)) {
    const frames: PIXI.Texture[] = [];
    for (const frameName of animDef.frames) {
      const texture = sheet.textures?.[frameName];
      if (!texture) {
        const errorMsg = `Frame '${frameName}' missing in spritesheet '${definition.spritesheetAsset}' for animation '${animName}'.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      frames.push(texture);
    }
    resolvedAnimations[animName] = {
      name: animName,
      frames,
      fps: animDef.fps,
      loop: animDef.loop,
    };
  }

  return {
    definition,
    animations: resolvedAnimations,
    fallbackTexture: fallbackTexture || PIXI.Texture.WHITE,
  };
}

export interface CreateAnimatedSpriteOptions {
  anchor?: number | { x: number; y: number };
  scaleMultiplier?: number;
  autoPlay?: boolean;
}

/**
 * Small helper to construct a configured Pixi AnimatedSprite (or Sprite fallback)
 * from resolved presentation metadata without duplicating FPS, loop, or scale calculations.
 */
export function createAnimatedSprite(
  presentation: ResolvedSpritePresentation,
  animationName?: string,
  options?: CreateAnimatedSpriteOptions
): PIXI.AnimatedSprite | PIXI.Sprite {
  const targetAnimName = animationName ?? presentation.definition.defaultAnimation;
  const anim = presentation.animations[targetAnimName];
  const targetHeight = presentation.definition.visualDimensions?.targetHeight;
  const scaleMultiplier = options?.scaleMultiplier ?? 1.0;

  if (anim && anim.frames.length > 0) {
    const animSprite = new PIXI.AnimatedSprite({ textures: anim.frames, autoUpdate: false });
    const anchor = options?.anchor ?? 0.5;
    if (typeof anchor === 'number') {
      animSprite.anchor.set(anchor);
    } else {
      animSprite.anchor.set(anchor.x, anchor.y);
    }
    animSprite.loop = anim.loop;
    animSprite.animationSpeed = anim.fps / 60;

    const baseTexture = anim.frames[0];
    if (targetHeight && baseTexture && baseTexture.height > 0) {
      const baseScale = targetHeight / baseTexture.height;
      animSprite.scale.set(baseScale * scaleMultiplier);
    } else {
      animSprite.scale.set(scaleMultiplier);
    }

    if (options?.autoPlay !== false && anim.loop) {
      animSprite.play();
    } else {
      animSprite.gotoAndStop(0);
    }
    return animSprite;
  }

  // Fallback to static Sprite
  const texture = presentation.fallbackTexture ?? PIXI.Texture.WHITE;
  const sprite = new PIXI.Sprite(texture);
  const anchor = options?.anchor ?? 0.5;
  if (typeof anchor === 'number') {
    sprite.anchor.set(anchor);
  } else {
    sprite.anchor.set(anchor.x, anchor.y);
  }

  if (targetHeight && texture.height > 0) {
    const baseScale = targetHeight / texture.height;
    sprite.scale.set(baseScale * scaleMultiplier);
  } else {
    sprite.width = 50 * scaleMultiplier;
    sprite.height = 50 * scaleMultiplier;
  }
  return sprite;
}

/** Advance from the owning simulation clock, never Ticker.shared. */
export function advanceSpriteAnimation(sprite: PIXI.Sprite, seconds: number): void {
  if (!(sprite instanceof PIXI.AnimatedSprite) || !sprite.playing || !Number.isFinite(seconds) || seconds <= 0) return;
  // AnimatedSprite.update reads only deltaTime, normalized to 60 Hz by Pixi.
  sprite.update({ deltaTime: seconds * 60 } as PIXI.Ticker);
}
