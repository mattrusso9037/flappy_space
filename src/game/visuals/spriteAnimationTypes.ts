/**
 * Type contracts for atlas-based sprite animations.
 */

export interface CollisionDimensions {
  width: number;
  height: number;
}

export interface SpriteAnimationDefinition {
  /** Array of frame texture names in the spritesheet atlas */
  frames: string[];
  /** Target frames per second */
  fps: number;
  /** Whether the animation loops continuously */
  loop: boolean;
}

export type SpriteAnimationGroup = Record<string, SpriteAnimationDefinition>;

export interface SpriteAssetDefinition {
  /** Unique stable ID for the sprite asset (e.g. 'astronaut', 'scout-drone') */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Name of the registered spritesheet asset in AssetManager */
  spritesheetAsset: string;
  /** Fallback or starting animation key (e.g. 'idle') */
  defaultAnimation: string;
  /** Animation definitions mapped by state name */
  animations: SpriteAnimationGroup;
  /** Fixed logical collision dimensions to maintain hitbox independence */
  collisionDimensions?: CollisionDimensions;
}
