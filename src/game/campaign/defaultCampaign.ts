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
    orbsRequired: 5,
    timeLimit: 60000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 45,
      secondaryPlanetChance: 0,
    },
    orbs: {
      spawnChance: 0.4,
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
  name: 'Alien Surface',
  intro: { type: 'cutscene', id: 'matter-gun-discovery' },
  gameplay: {
    speeds: {
      planet: BASE_SPEEDS.planet * LEVEL_MULTIPLIERS[1],
      secondaryPlanet: BASE_SPEEDS.secondaryPlanet * LEVEL_MULTIPLIERS[1],
      orb: BASE_SPEEDS.orb * LEVEL_MULTIPLIERS[1],
    },
    spawnInterval: 2200,
    orbsRequired: 8,
    timeLimit: 60000,
    obstacles: {
      enabled: false,
    },
    ground: {
      enabled: true,
      height: 80,
    },
    movement: {
      mode: 'ground',
      maxThrustCharges: 1,
    },
    tools: {
      equipped: 'wall-builder',
      shovel: { reach: 40 },
      grappleHook: { range: 500, pullSpeed: 360, anchors: [{ id: 'raised-pickup', x: 700, y: 250 }] },
      wallBuilder: { width: 80, height: 80, maxActive: 2, lifetimeSeconds: 20 },
    },
    world: {
      width: 2400,
      traversal: 'loop',
    },
    // A solid roof and one removable plug form a short walk-through tunnel.
    terrainBlocks: [
      { id: 'tunnel-roof', bounds: { x: 1000, y: 360, width: 320, height: 60 }, diggable: false },
      { id: 'tunnel-plug', bounds: { x: 1100, y: 420, width: 60, height: 100 }, diggable: true },
    ],
    scenarios: [
      {
        id: 'crystal-chamber',
        trigger: { x: 1600, y: 0, width: 400, height: 600 },
        cameraBounds: { x: 1600, y: 0, width: 800, height: 600 },
      },
    ],
    orbs: {
      // Jump onto a built panel, then thrust again to reach this raised pickup.
      placements: [{ x: 700, y: 290 }],
      spawnChance: 0.6,
      minY: 360,
      maxY: 480,
    },
    levelNumber: 2,
  },
  presentation: {
    environmentId: 'alien-surface',
    terrainId: 'alien-crust',
    musicId: 'weightless-space',
  },
  nextLevelId: 'sector-03',
};


export const SECTOR_03: LevelDefinition = {
  id: 'sector-03',
  name: 'The Relay Vault',
  gameplay: {
    speeds: { ...BASE_SPEEDS }, // Spawn systems are disabled; authored geometry stays in world space.
    spawnInterval: 2000,
    orbsRequired: 8,
    timeLimit: 180000,
    obstacles: { enabled: false },
    ground: { enabled: true, height: 80 },
    movement: { mode: 'ground', maxThrustCharges: 1 },
    world: { width: 2800, traversal: 'bounded' },
    tools: {
      equipped: 'grapple-hook',
      grappleHook: {
        range: 430,
        pullSpeed: 360,
        anchors: [
          { id: 'first-ascent', x: 880, y: 160 },
          { id: 'upper-balcony', x: 1320, y: 100 },
          { id: 'vault-crossing', x: 1570, y: 70 },
          { id: 'final-relay', x: 2460, y: 120 },
        ],
      },
    },
    terrainBlocks: [
      // 1. Learn to land, recharge and jump again before the first grapple.
      { id: 'first-step', bounds: { x: 330, y: 440, width: 150, height: 80 }, diggable: false },
      { id: 'second-step', bounds: { x: 600, y: 350, width: 150, height: 30 }, diggable: false },
      { id: 'catch-balcony', bounds: { x: 940, y: 280, width: 200, height: 30 }, diggable: false },
      // 2. Approach anchors from the open side, release, then steer onto the ledge.
      { id: 'upper-balcony', bounds: { x: 1400, y: 220, width: 140, height: 30 }, diggable: false },
      { id: 'vault-barrier', bounds: { x: 1600, y: 180, width: 80, height: 340 }, diggable: false },
      // 3. Drop to the recovery platform, jump under the ceiling, grapple outside it.
      { id: 'recovery-platform', bounds: { x: 1900, y: 350, width: 160, height: 30 }, diggable: false },
      { id: 'last-step', bounds: { x: 2150, y: 270, width: 160, height: 30 }, diggable: false },
      { id: 'low-ceiling', bounds: { x: 1900, y: 70, width: 450, height: 40 }, diggable: false },
      { id: 'relay-vault', bounds: { x: 2540, y: 190, width: 200, height: 30 }, diggable: false },
    ],
    orbs: {
      spawnChance: 0,
      placements: [
        { x: 400, y: 405 }, { x: 680, y: 315 },
        { x: 1030, y: 245 }, { x: 1470, y: 185 },
        { x: 1640, y: 145 }, { x: 1980, y: 315 },
        { x: 2230, y: 235 }, { x: 2640, y: 155 },
      ],
    },
    levelNumber: 3,
  },
  presentation: {
    environmentId: 'violet-reach',
    terrainId: 'alien-crust',
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
    orbsRequired: 15,
    timeLimit: 70000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 60,
      secondaryPlanetChance: 0.3,
    },
    orbs: {
      spawnChance: 0.4,
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
    orbsRequired: 20,
    timeLimit: 80000,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 65,
      secondaryPlanetChance: 0.3,
    },
    orbs: {
      spawnChance: 0.4,
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
