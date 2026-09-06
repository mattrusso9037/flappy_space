import { CampaignDefinition, CampaignProgress, LevelDefinition } from './campaignTypes';
import { BASE_SPEEDS, LEVEL_MULTIPLIERS } from '../config';

export const DEFAULT_CAMPAIGN_ID = 'flappy-spaceman-main';

export const SECTOR_01: LevelDefinition = {
  id: 'sector-01',
  name: 'Sector 01',
  intro: { type: 'cutscene', id: 'opening-spacewalk' },
  gameplay: {
    speeds: {
      planet: BASE_SPEEDS.planet * LEVEL_MULTIPLIERS[0],
      secondaryPlanet: BASE_SPEEDS.secondaryPlanet * LEVEL_MULTIPLIERS[0],
      orb: BASE_SPEEDS.orb * LEVEL_MULTIPLIERS[0],
    },
    spawnInterval: 2500,
    orbSpawnChance: 0.4,
    orbsRequired: 5,
    timeLimit: 60000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 45,
      secondaryPlanetChance: 0,
    },
    levelNumber: 1,
  },
  presentation: {
    environmentId: 'deep-nebula',
    musicId: 'weightless-space',
  },
  nextLevelId: 'sector-02',
};

export const SECTOR_02: LevelDefinition = {
  id: 'sector-02',
  name: 'Sector 02',
  gameplay: {
    speeds: {
      planet: BASE_SPEEDS.planet * LEVEL_MULTIPLIERS[1],
      secondaryPlanet: BASE_SPEEDS.secondaryPlanet * LEVEL_MULTIPLIERS[1],
      orb: BASE_SPEEDS.orb * LEVEL_MULTIPLIERS[1],
    },
    spawnInterval: 2200,
    orbSpawnChance: 0.4,
    orbsRequired: 8,
    timeLimit: 60000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 50,
      secondaryPlanetChance: 0.3,
    },
    levelNumber: 2,
  },
  presentation: {
    environmentId: 'deep-nebula',
    musicId: 'weightless-space',
  },
  nextLevelId: 'sector-03',
};

export const SECTOR_03: LevelDefinition = {
  id: 'sector-03',
  name: 'Sector 03',
  gameplay: {
    speeds: {
      planet: BASE_SPEEDS.planet * LEVEL_MULTIPLIERS[2],
      secondaryPlanet: BASE_SPEEDS.secondaryPlanet * LEVEL_MULTIPLIERS[2],
      orb: BASE_SPEEDS.orb * LEVEL_MULTIPLIERS[2],
    },
    spawnInterval: 2000,
    orbSpawnChance: 0.4,
    orbsRequired: 12,
    timeLimit: 70000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 55,
      secondaryPlanetChance: 0.3,
    },
    levelNumber: 3,
  },
  presentation: {
    environmentId: 'deep-nebula',
    musicId: 'weightless-space',
  },
  nextLevelId: 'sector-04',
};

export const SECTOR_04: LevelDefinition = {
  id: 'sector-04',
  name: 'Sector 04',
  gameplay: {
    speeds: {
      planet: BASE_SPEEDS.planet * LEVEL_MULTIPLIERS[3],
      secondaryPlanet: BASE_SPEEDS.secondaryPlanet * LEVEL_MULTIPLIERS[3],
      orb: BASE_SPEEDS.orb * LEVEL_MULTIPLIERS[3],
    },
    spawnInterval: 1800,
    orbSpawnChance: 0.4,
    orbsRequired: 15,
    timeLimit: 70000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 60,
      secondaryPlanetChance: 0.3,
    },
    levelNumber: 4,
  },
  presentation: {
    environmentId: 'deep-nebula',
    musicId: 'weightless-space',
  },
  nextLevelId: 'sector-05',
};

export const SECTOR_05: LevelDefinition = {
  id: 'sector-05',
  name: 'Sector 05',
  gameplay: {
    speeds: {
      planet: BASE_SPEEDS.planet * LEVEL_MULTIPLIERS[4],
      secondaryPlanet: BASE_SPEEDS.secondaryPlanet * LEVEL_MULTIPLIERS[4],
      orb: BASE_SPEEDS.orb * LEVEL_MULTIPLIERS[4],
    },
    spawnInterval: 1600,
    orbSpawnChance: 0.4,
    orbsRequired: 20,
    timeLimit: 80000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 65,
      secondaryPlanetChance: 0.3,
    },
    levelNumber: 5,
  },
  presentation: {
    environmentId: 'deep-nebula',
    musicId: 'weightless-space',
  },
};

export const DEFAULT_CAMPAIGN: CampaignDefinition = {
  id: DEFAULT_CAMPAIGN_ID,
  name: 'Flappy Spaceman Main Campaign',
  startingLevelId: 'sector-01',
  levels: {
    'sector-01': SECTOR_01,
    'sector-02': SECTOR_02,
    'sector-03': SECTOR_03,
    'sector-04': SECTOR_04,
    'sector-05': SECTOR_05,
  },
};

export function createInitialProgress(
  campaign: CampaignDefinition = DEFAULT_CAMPAIGN
): CampaignProgress {
  return {
    schemaVersion: 1,
    campaignId: campaign.id,
    currentLevelId: campaign.startingLevelId,
    unlockedLevelIds: [campaign.startingLevelId],
    completedLevelIds: [],
    highScores: {},
    storyFlags: {},
    updatedAt: new Date().toISOString(),
  };
}
