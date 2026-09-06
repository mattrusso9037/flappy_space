import { PlayerToolsDefinition } from '../tools/toolTypes';
import { EnvironmentId } from '../environments/environmentTypes';
import { MusicTrackId } from '../audio/musicCatalog';
import { DialogueId } from '../story/dialogue/dialogueTypes';
import { CutsceneId } from '../story/cutscenes/cutsceneTypes';
import { VideoCutsceneId } from '../story/video/videoCutsceneTypes';

import { TerrainId } from '../visuals/terrainPresets';

export type LevelId = string;
export type CampaignId = string;

export type StoryTransition =
  | { type: 'dialogue'; id: DialogueId }
  | { type: 'cutscene'; id: CutsceneId }
  | { type: 'video'; id: VideoCutsceneId };

export type StoryContinuation =
  | { type: 'start-level'; levelId: LevelId }
  | { type: 'story'; transition: StoryTransition; continuation: StoryContinuation }
  | { type: 'credits' }
  | { type: 'title' };

export type ObstacleGameplayDefinition =
  | {
      /** Disable obstacle spawning completely. Planet metadata is not required. */
      enabled: false;
      minPlanetRadius?: number;
      maxPlanetRadius?: number;
      secondaryPlanetChance?: number;
    }
  | {
      /** Enable obstacle spawning with explicit planet balance parameters. Defaults to true if omitted. */
      enabled?: true;
      minPlanetRadius: number;
      maxPlanetRadius: number;
      secondaryPlanetChance: number;
    };

export interface GroundGameplayDefinition {
  enabled: boolean;
  /** Height in game pixels from bottom of canvas. */
  height: number;
}

/** One authored terrain solid; geometry never derives from visual styling. */
export interface TerrainBlockDefinition {
  id: string;
  bounds: Rect;
  diggable: boolean;
}

/** Axis-aligned rectangle in world space (all values in game pixels). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * World-space definition for ground traversal levels.
 * Enables the world/camera system; absent means viewport-only (flight) mode.
 */
export interface WorldDefinition {
  /** Total world width in game pixels. Must be >= GAME_WIDTH (800). */
  width: number;
  /** Repeat terrain every width pixels with continuous world coordinates. Defaults to bounded. */
  traversal?: 'bounded' | 'loop';
}

/**
 * An authored scenario zone within the world.
 * Entering the trigger bounds locks the camera to the camera area.
 * Completing the scenario unlocks the camera and prevents re-entry.
 */
export interface ScenarioDefinition {
  id: string;
  /** World-space trigger rectangle: player entering this rect starts the scenario. */
  trigger: Rect;
  /**
   * World-space camera view rectangle when locked.
   * cameraBounds.x is used as the left edge of the locked camera view.
   */
  cameraBounds: Rect;
}

export type MovementMode = 'flight' | 'ground';

export type MovementGameplayDefinition =
  | {
      /** Default corridor flight mode with unlimited thrust. */
      mode: 'flight';
    }
  | {
      /** Planetary ground traversal mode with jet jump capacity. */
      mode: 'ground';
      /**
       * Maximum jet-assisted thrust charges before requiring a landing recharge.
       * Fully supports multi-thrust (e.g. maxThrustCharges: 1 or 2 for double jump).
       */
      maxThrustCharges: number;
    };

export interface OrbGameplayDefinition {
  /** Explicit spawn probability in [0, 1]. */
  spawnChance: number;
  /** Optional independent spawn interval in milliseconds. If omitted, uses gameplay.spawnInterval. */
  spawnInterval?: number;
  /** Fixed world-space pickups, created once per level load. Requires gameplay.world. */
  placements?: { x: number; y: number }[];
  /** Optional minimum Y coordinate for orb spawning. */
  minY?: number;
  /** Optional maximum Y coordinate for orb spawning. */
  maxY?: number;
}

export interface LevelGameplayDefinition {
  speeds: {
    planet: number;
    secondaryPlanet: number;
    orb: number;
  };

  spawnInterval: number;
  orbsRequired: number;
  timeLimit: number;

  obstacles: ObstacleGameplayDefinition;

  /** Single canonical orb configuration */
  orbs: OrbGameplayDefinition;

  /** Optional player tools. Omission disables tools and clears equipment. */
  tools?: PlayerToolsDefinition;
  /** Authored static solids, independently removable only when explicitly diggable. */
  terrainBlocks?: readonly TerrainBlockDefinition[];

  /** Optional planetary ground terrain definition */
  ground?: GroundGameplayDefinition;

  /** Optional movement mode and thrust capacity configuration */
  movement?: MovementGameplayDefinition;

  /**
   * Optional world-space definition. When present, enables world/camera traversal
   * for ground levels. Astronaut moves in world coordinates; RenderSystem applies
   * camera transforms. Absent for flight levels (viewport-only).
   */
  world?: WorldDefinition;

  /**
   * Optional authored scenario zones. Camera locks to cameraBounds on trigger entry;
   * unlocks on completion. Requires gameplay.world to be present.
   */
  scenarios?: ScenarioDefinition[];

  /** Optional display metadata only - does NOT dictate gameplay difficulty */
  levelNumber?: number;
}

export interface LevelPresentationDefinition {
  environmentId: EnvironmentId;
  terrainId?: TerrainId;
  musicId?: MusicTrackId;
}

export interface LevelDefinition {
  id: LevelId;
  name: string;

  gameplay: LevelGameplayDefinition;

  presentation: LevelPresentationDefinition;

  intro?: StoryTransition;
  outro?: StoryTransition;

  nextLevelId?: LevelId;
}

export interface CampaignDefinition {
  id: CampaignId;
  name: string;

  startingLevelId: LevelId;

  levels: Record<LevelId, LevelDefinition>;

  ending?: StoryTransition;
}

export type GamePhase =
  | { type: 'title' }
  | { type: 'playing'; levelId: LevelId }
  | { type: 'levelComplete'; levelId: LevelId }
  | { type: 'gameOver'; levelId: LevelId }
  | { type: 'dialogue'; dialogueId: DialogueId }
  | { type: 'cutscene'; cutsceneId: CutsceneId }
  | { type: 'video'; videoId: VideoCutsceneId }
  | { type: 'credits' };

export interface CampaignProgress {
  schemaVersion: number;

  campaignId: CampaignId;

  currentLevelId: LevelId;

  unlockedLevelIds: LevelId[];
  completedLevelIds: LevelId[];

  highScores: Record<LevelId, number>;

  storyFlags: Record<string, boolean>;

  updatedAt: string;
}
