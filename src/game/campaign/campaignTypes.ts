export type LevelId = string;
export type CampaignId = string;

export type StoryTransition =
  | { type: 'dialogue'; id: string }
  | { type: 'cutscene'; id: string };

export interface LevelDefinition {
  id: LevelId;
  name: string;

  gameplay: {
    speeds: {
      planet: number;
      secondaryPlanet: number;
      orb: number;
    };

    spawnInterval: number;
    orbFrequency: number;
    orbsRequired: number;
    timeLimit: number;
    levelNumber?: number;
  };

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
  | { type: 'dialogue'; dialogueId: string }
  | { type: 'cutscene'; cutsceneId: string }
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
