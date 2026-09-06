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

export interface ObstacleGameplayDefinition {
  /** Optional flag to enable/disable obstacle spawning. Defaults to true. */
  enabled?: boolean;
  minPlanetRadius: number;
  maxPlanetRadius: number;
  secondaryPlanetChance: number;
}

export interface GroundGameplayDefinition {
  enabled: boolean;
  /** Height in game pixels from bottom of canvas. */
  height: number;
}

export type MovementMode = 'flight' | 'ground';

export interface MovementGameplayDefinition {
  /** Movement style: deep space flight or ground traversal. Defaults to 'flight'. */
  mode?: MovementMode;
  /**
   * Maximum jet-assisted thrust charges before requiring a landing recharge.
   * Defaults to 1 for ground mode and Infinity for flight mode.
   * Fully supports multi-thrust (e.g. maxThrustCharges: 2 for double jump).
   */
  maxThrustCharges?: number;
}

export interface OrbGameplayDefinition {
  /** Optional independent spawn interval in milliseconds. If omitted, uses gameplay.spawnInterval. */
  spawnInterval?: number;
  /** Optional explicit spawn chance in [0, 1]. If omitted, uses gameplay.orbSpawnChance. */
  spawnChance?: number;
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
  orbSpawnChance: number;
  orbsRequired: number;
  timeLimit: number;

  obstacles: ObstacleGameplayDefinition;

  /** Optional planetary ground terrain definition */
  ground?: GroundGameplayDefinition;

  /** Optional movement mode and thrust capacity configuration */
  movement?: MovementGameplayDefinition;

  /** Optional independent orb spawn and vertical range configuration */
  orbs?: OrbGameplayDefinition;

  /** Optional shorthand for vertical orb spawn range */
  orbSpawnRange?: {
    minY: number;
    maxY: number;
  };

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
