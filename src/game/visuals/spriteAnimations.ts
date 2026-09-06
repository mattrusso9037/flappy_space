import { SpriteAssetDefinition } from './spriteAnimationTypes';
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
 * Expected states:
 * - idle: looping hover state
 * - thrust: jetpack ignition pulse (returns to idle)
 * - hit: obstacle impact recoil
 * - death: terminal destruction sequence
 * - warp: hyperspace sector-warp acceleration
 *
 * Collision dimensions are fixed at 35x35 (0.7 scale of standard 50px rendered frame)
 * to guarantee hitbox independence from visual frame dimensions.
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
  animations: {
    idle: {
      frames: ['idle_00'],
      fps: 1,
      loop: false,
    },
    thrust: {
      frames: ['idle_00', 'idle_01', 'idle_02', 'idle_03', 'idle_04', 'idle_05', 'idle_06', 'idle_07'],
      fps: 20,
      loop: false,
    },
    hit: {
      frames: ['idle_05', 'idle_06'],
      fps: 10,
      loop: false,
    },
    death: {
      frames: ['idle_00', 'idle_02', 'idle_04', 'idle_06'],
      fps: 12,
      loop: false,
    },
    warp: {
      frames: ['idle_00', 'idle_01', 'idle_02', 'idle_03', 'idle_04', 'idle_05', 'idle_06', 'idle_07'],
      fps: 16,
      loop: true,
    },
  },
};

// Register default canonical definitions
registerSpriteAnimation(ASTRONAUT_SPRITE_DEFINITION);
