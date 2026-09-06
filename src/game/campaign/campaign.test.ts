import { describe, it, expect } from 'vitest';
import { DEFAULT_CAMPAIGN, DEFAULT_CAMPAIGN_ID, createInitialProgress } from './defaultCampaign';
import { validateCampaignDefinition } from './validateCampaign';
import { LEVELS } from '../config';

describe('Campaign Definition & Data Migration', () => {
  it('passes comprehensive campaign validation', () => {
    const validation = validateCampaignDefinition(DEFAULT_CAMPAIGN);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('has a valid campaign ID and starting level', () => {
    expect(DEFAULT_CAMPAIGN.id).toBe(DEFAULT_CAMPAIGN_ID);
    expect(DEFAULT_CAMPAIGN.startingLevelId).toBe('sector-01');
    expect(DEFAULT_CAMPAIGN.levels[DEFAULT_CAMPAIGN.startingLevelId]).toBeDefined();
  });

  it('ensures all referenced nextLevelIds exist within the campaign', () => {
    for (const [levelId, levelDef] of Object.entries(DEFAULT_CAMPAIGN.levels)) {
      expect(levelDef.id).toBe(levelId);
      if (levelDef.nextLevelId) {
        expect(DEFAULT_CAMPAIGN.levels[levelDef.nextLevelId]).toBeDefined();
      }
    }
  });

  it('preserves unchanged campaign sectors and sequencing', () => {
    const levelIds = ['sector-01', 'sector-02', 'sector-03', 'sector-04', 'sector-05'];
    expect(levelIds).toHaveLength(LEVELS.length);

    levelIds.forEach((id, index) => {
      const levelDef = DEFAULT_CAMPAIGN.levels[id];
      const legacyConfig = LEVELS[index];
      if (id === 'sector-03') return; // The authored demo has its own traversal tests.

      expect(levelDef).toBeDefined();
      expect(levelDef.gameplay.speeds.planet).toBe(legacyConfig.speeds.planet);
      expect(levelDef.gameplay.speeds.secondaryPlanet).toBe(legacyConfig.speeds.secondaryPlanet);
      expect(levelDef.gameplay.speeds.orb).toBe(legacyConfig.speeds.orb);
      expect(levelDef.gameplay.spawnInterval).toBe(legacyConfig.spawnInterval);
      expect(levelDef.gameplay.orbsRequired).toBe(legacyConfig.orbsRequired);
      expect(levelDef.gameplay.timeLimit).toBe(legacyConfig.timeLimit);
      expect(levelDef.gameplay.orbs.spawnChance).toBe(id === 'sector-02' ? 0.6 : 0.4);
      expect(levelDef.gameplay.levelNumber).toBe(index + 1);

      if (id === 'sector-02') {
        expect(levelDef.gameplay.obstacles.enabled).toBe(false);
        expect(levelDef.gameplay.movement).toEqual({ mode: 'ground', maxThrustCharges: 1 });
        expect(levelDef.gameplay.orbs).toEqual({ spawnChance: 0.6, minY: 360, maxY: 480, placements: [{ x: 700, y: 290 }] });
      } else {
        // Explicit obstacle configuration
        expect(levelDef.gameplay.obstacles.minPlanetRadius).toBe(20);
        expect(levelDef.gameplay.obstacles.maxPlanetRadius).toBe(40 + (index + 1) * 5);
        expect(levelDef.gameplay.obstacles.enabled).toBeUndefined();
        expect(levelDef.gameplay.obstacles.secondaryPlanetChance).toBe(index === 0 ? 0 : 0.3);
        expect(levelDef.gameplay.movement).toBeUndefined();
      }

      // Presentation & Ground
      expect(levelDef.presentation.environmentId).toBe(
        id === 'sector-02' ? 'alien-surface' : 'deep-nebula'
      );
      expect(levelDef.presentation.musicId).toBe('weightless-space');

      if (id === 'sector-02') {
        expect(levelDef.gameplay.ground).toBeDefined();
        expect(levelDef.gameplay.ground?.enabled).toBe(true);
        expect(levelDef.gameplay.ground?.height).toBe(80);
        expect(levelDef.presentation.terrainId).toBe('alien-crust');
      } else {
        expect(levelDef.gameplay.ground).toBeUndefined();
        expect(levelDef.presentation.terrainId).toBeUndefined();
      }
    });

    // Check chaining order
    expect(DEFAULT_CAMPAIGN.levels['sector-01'].nextLevelId).toBe('sector-02');
    expect(DEFAULT_CAMPAIGN.levels['sector-02'].nextLevelId).toBe('sector-03');
    expect(DEFAULT_CAMPAIGN.levels['sector-03'].nextLevelId).toBe('sector-04');
    expect(DEFAULT_CAMPAIGN.levels['sector-04'].nextLevelId).toBe('sector-05');
    expect(DEFAULT_CAMPAIGN.levels['sector-05'].nextLevelId).toBeUndefined();
  });

  it('creates initial campaign progress with starting level unlocked', () => {
    const progress = createInitialProgress(DEFAULT_CAMPAIGN);

    expect(progress.schemaVersion).toBe(1);
    expect(progress.campaignId).toBe(DEFAULT_CAMPAIGN.id);
    expect(progress.currentLevelId).toBe('sector-01');
    expect(progress.unlockedLevelIds).toEqual(['sector-01']);
    expect(progress.completedLevelIds).toEqual([]);
    expect(progress.highScores).toEqual({});
    expect(progress.storyFlags).toEqual({});
    expect(typeof progress.updatedAt).toBe('string');
  });
});

it('validates traversal mode, loop length, and required ground capability', () => {
  const campaign = structuredClone(DEFAULT_CAMPAIGN);
  const gameplay = campaign.levels['sector-02'].gameplay;
  gameplay.terrainBlocks = []; // Isolate world validation from authored puzzle bounds.
  for (const width of [800, 3200, 10000]) {
    gameplay.world = { width, traversal: 'loop' };
    gameplay.scenarios = [];
    expect(validateCampaignDefinition(campaign).valid).toBe(true);
  }
  for (const width of [0, 799, NaN, Infinity]) {
    gameplay.world = { width, traversal: 'loop' };
    expect(validateCampaignDefinition(campaign).valid).toBe(false);
  }
  gameplay.world = { width: 2400, traversal: 'loop' };
  Object.assign(gameplay.world, { traversal: 'invalid' });
  expect(validateCampaignDefinition(campaign).errors.some(e => e.includes('world.traversal'))).toBe(true);
  gameplay.world = { width: 2400, traversal: 'loop' };
  gameplay.movement = { mode: 'flight' };
  expect(validateCampaignDefinition(campaign).valid).toBe(false);
});
