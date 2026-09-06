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

  /** Optional planetary ground terrain definition */
  ground?: GroundGameplayDefinition;

  /** Optional movement mode and thrust capacity configuration */
  movement?: MovementGameplayDefinition;

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
