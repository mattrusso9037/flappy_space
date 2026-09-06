import { EnvironmentId } from '../environments/environmentTypes';
import { MusicTrackId } from '../audio/musicCatalog';
import { DialogueId } from '../story/dialogue/dialogueTypes';
import { CutsceneId } from '../story/cutscenes/cutsceneTypes';
import { VideoCutsceneId } from '../story/video/videoCutsceneTypes';

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
  minPlanetRadius: number;
  maxPlanetRadius: number;
  secondaryPlanetChance: number;
}

export interface GroundGameplayDefinition {
  enabled: boolean;
  /** Height in game pixels from bottom of canvas. Defaults to 80px (ground at y = GAME_HEIGHT - 80 = 520). */
  height?: number;
  /** Visual ground style, e.g. 'alien-crust' | 'rocky' | 'default' */
  style?: 'alien-crust' | 'rocky' | 'default';
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

  /** Optional display metadata only - does NOT dictate gameplay difficulty */
  levelNumber?: number;
}

export interface LevelPresentationDefinition {
  environmentId: EnvironmentId;
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
