import { describe, it, expect } from 'vitest';
import { validateCampaignDefinition } from './validateCampaign';
import { CampaignDefinition } from './campaignTypes';

function createValidCampaign(): CampaignDefinition {
  return {
    id: 'test-campaign',
    name: 'Test Campaign',
    startingLevelId: 'lvl-1',
    levels: {
      'lvl-1': {
        id: 'lvl-1',
        name: 'Level 1',
        gameplay: {
          speeds: { planet: 3, secondaryPlanet: 2.5, orb: 2 },
          spawnInterval: 2500,
          orbSpawnChance: 0.4,
          orbsRequired: 5,
          timeLimit: 60000,
          obstacles: {
            minPlanetRadius: 20,
            maxPlanetRadius: 45,
            secondaryPlanetChance: 0.3,
          },
        },
        presentation: {
          environmentId: 'deep-nebula',
          musicId: 'weightless-space',
        },
        nextLevelId: 'lvl-2',
      },
      'lvl-2': {
        id: 'lvl-2',
        name: 'Level 2',
        gameplay: {
          speeds: { planet: 3.5, secondaryPlanet: 3, orb: 2.5 },
          spawnInterval: 2200,
          orbSpawnChance: 0.5,
          orbsRequired: 8,
          timeLimit: 60000,
          obstacles: {
            minPlanetRadius: 20,
            maxPlanetRadius: 50,
            secondaryPlanetChance: 0.3,
          },
        },
        presentation: {
          environmentId: 'violet-reach',
        },
      },
    },
  };
}

describe('validateCampaignDefinition', () => {
  it('returns valid: true for a correctly formed campaign', () => {
    const campaign = createValidCampaign();
    const result = validateCampaignDefinition(campaign);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when starting level is not found in levels', () => {
    const campaign = createValidCampaign();
    campaign.startingLevelId = 'non-existent';

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('starting level'))).toBe(true);
  });

  it('fails when record key does not match level.id', () => {
    const campaign = createValidCampaign();
    // Intentionally assign level under a mismatched key
    campaign.levels['mismatched-key'] = { ...campaign.levels['lvl-1'] };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('does not match level.id'))).toBe(true);
  });

  it('fails when nextLevelId points to non-existent level', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].nextLevelId = 'broken-link';

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('nextLevelId "broken-link" does not exist'))).toBe(true);
  });

  it('fails when environmentId is unknown', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].presentation.environmentId = 'unknown-nebula-galaxy';

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid environmentId'))).toBe(true);
  });

  it('fails when musicId is unknown', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].presentation.musicId = 'unknown-song-track';

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid musicId'))).toBe(true);
  });

  it('fails when orbSpawnChance is outside [0, 1]', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].gameplay.orbSpawnChance = 1.5;

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('orbSpawnChance'))).toBe(true);
  });

  it('fails when obstacle radius configuration is invalid', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].gameplay.obstacles.maxPlanetRadius = 10;
    campaign.levels['lvl-1'].gameplay.obstacles.minPlanetRadius = 20;

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('maxPlanetRadius must be greater than or equal to minPlanetRadius'))).toBe(true);
  });

  it('fails when secondaryPlanetChance is outside [0, 1]', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].gameplay.obstacles.secondaryPlanetChance = -0.1;

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('secondaryPlanetChance'))).toBe(true);
  });

  it('fails when orbsRequired is not a positive integer', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].gameplay.orbsRequired = 3.5;

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('orbsRequired must be a positive integer'))).toBe(true);
  });

  it('fails when timeLimit is non-positive', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].gameplay.timeLimit = 0;

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('timeLimit must be a positive number'))).toBe(true);
  });

  it('validates story transitions when present', () => {
    const campaign = createValidCampaign();
    // @ts-expect-error invalid transition type
    campaign.levels['lvl-1'].intro = { type: 'invalid_type', id: 'intro-1' };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('intro transition'))).toBe(true);
  });
});
