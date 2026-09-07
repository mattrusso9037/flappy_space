import type { Texture } from 'pixi.js';

export interface CollisionDimensions {
  width: number;
  height: number;
}

export interface VisualDimensions {
  /** Target rendered height in virtual game canvas pixels (aspect ratio preserved) */
  targetHeight: number;
}

export interface SpriteAnimationDefinition {
  /** Array of frame texture names in the spritesheet atlas */
  frames: string[];
  /** Target frames per second */
  fps: number;
  /** Whether the animation loops continuously */
  loop: boolean;
  /** Optional spritesheet asset name override if different from parent SpriteAssetDefinition */
  spritesheetAsset?: string;
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
  /** Canonical display sizing metadata */
  visualDimensions?: VisualDimensions;
}

export interface ResolvedSpriteAnimation {
  name: string;
  frames: Texture[];
  fps: number;
  loop: boolean;
}

export interface ResolvedSpritePresentation {
  definition: SpriteAssetDefinition;
  animations: Record<string, ResolvedSpriteAnimation>;
  fallbackTexture?: Texture;
}
