import { describe, it, expect, afterEach } from 'vitest';
import { validateCampaignDefinition } from './validateCampaign';
import { CampaignDefinition } from './campaignTypes';
import { registerVideoCutscene, clearVideoCutsceneRegistry } from '../story/video/videoCutscenes';

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
          orbsRequired: 5,
          timeLimit: 60000,
          obstacles: {
            minPlanetRadius: 20,
            maxPlanetRadius: 45,
            secondaryPlanetChance: 0.3,
          },
          orbs: {
            spawnChance: 0.4,
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
          orbsRequired: 8,
          timeLimit: 60000,
          obstacles: {
            minPlanetRadius: 20,
            maxPlanetRadius: 50,
            secondaryPlanetChance: 0.3,
          },
          orbs: {
            spawnChance: 0.5,
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

  it('fails when orbs.spawnChance is outside [0, 1]', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].gameplay.orbs.spawnChance = 1.5;

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('orbs.spawnChance'))).toBe(true);
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

  afterEach(() => {
    clearVideoCutsceneRegistry();
  });

  it('validates story transitions when present and registered', () => {
    registerVideoCutscene({
      id: 'valid-test-video',
      src: '/cutscenes/valid.mp4',
    });

    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].intro = { type: 'dialogue', id: 'unknown-signal' };
    campaign.levels['lvl-1'].outro = { type: 'cutscene', id: 'first-signal' };
    campaign.levels['lvl-2'].outro = { type: 'video', id: 'valid-test-video' };
    campaign.ending = { type: 'video', id: 'valid-test-video' };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when story transition references unregistered dialogue', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].intro = { type: 'dialogue', id: 'non-existent-dialogue' };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('references unregistered dialogue "non-existent-dialogue"'))).toBe(true);
  });

  it('fails when story transition references unregistered cutscene', () => {
    const campaign = createValidCampaign();
    campaign.levels['lvl-1'].outro = { type: 'cutscene', id: 'non-existent-cutscene' };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('references unregistered cutscene "non-existent-cutscene"'))).toBe(true);
  });

  it('fails when story transition references unregistered video or missing video asset registration', () => {
    const campaign = createValidCampaign();
    // opening-transmission has no video asset and is not registered in the production registry
    campaign.levels['lvl-1'].outro = { type: 'video', id: 'opening-transmission' };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('references unregistered video cutscene "opening-transmission"'))).toBe(true);
  });

  it('fails when campaign ending references unregistered content', () => {
    const campaign = createValidCampaign();
    campaign.ending = { type: 'cutscene', id: 'missing-ending-cutscene' };

    const result = validateCampaignDefinition(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('references unregistered cutscene "missing-ending-cutscene"'))).toBe(true);
  });

  describe('ground and terrain validation', () => {
    it('accepts valid ground configuration and registered terrainId', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: 80,
      };
      campaign.levels['lvl-1'].presentation.terrainId = 'alien-crust';

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts ground omitted (space level)', () => {
      const campaign = createValidCampaign();
      delete campaign.levels['lvl-1'].gameplay.ground;
      delete campaign.levels['lvl-1'].presentation.terrainId;

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts ground with enabled: false', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: false,
        height: 80,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects non-boolean ground.enabled', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: 'yes' as unknown as boolean,
        height: 80,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground.enabled must be a boolean'))).toBe(true);
    });

    it('rejects ground.height = 0', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: 0,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground.height must be a positive finite number'))).toBe(true);
    });

    it('rejects negative ground.height', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: -50,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground.height must be a positive finite number'))).toBe(true);
    });

    it('rejects NaN ground.height', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: NaN,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground.height must be a positive finite number'))).toBe(true);
    });

    it('rejects Infinity ground.height', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: Infinity,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground.height must be a positive finite number'))).toBe(true);
    });

    it('rejects ground.height >= GAME_HEIGHT', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: 600,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground.height must be less than GAME_HEIGHT'))).toBe(true);
    });

    it('rejects ground.height that leaves an unviable gameplay corridor (< 100px)', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.ground = {
        enabled: true,
        height: 520, // 600 - 520 = 80px corridor < 100px
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('leaves an unviable gameplay corridor'))).toBe(true);
    });

    it('rejects unknown terrainId', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].presentation.terrainId = 'volcanic-wasteland' as unknown as 'alien-crust';

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('References invalid terrainId "volcanic-wasteland"'))).toBe(true);
    });
  });

  describe('movement, obstacle enabling, and orb validation', () => {
    it('accepts valid movement, disabled obstacles without planet metadata, and orb range configurations', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.obstacles = {
        enabled: false,
      };
      campaign.levels['lvl-1'].gameplay.movement = {
        mode: 'ground',
        maxThrustCharges: 1,
      };
      campaign.levels['lvl-1'].gameplay.orbs = {
        spawnInterval: 2000,
        spawnChance: 0.6,
        minY: 360,
        maxY: 480,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects invalid movement mode', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.movement = {
        mode: 'teleport' as unknown as 'ground',
        maxThrustCharges: 1,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("movement.mode must be 'flight' or 'ground'"))).toBe(true);
    });

    it('rejects non-integer or non-positive maxThrustCharges in ground mode', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.movement = {
        mode: 'ground',
        maxThrustCharges: -1,
      };

      let result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground movement requires a positive integer maxThrustCharges'))).toBe(true);

      campaign.levels['lvl-1'].gameplay.movement = {
        mode: 'ground',
        maxThrustCharges: 1.5,
      };
      result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ground movement requires a positive integer maxThrustCharges'))).toBe(true);
    });

    it('rejects non-boolean obstacles.enabled', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.obstacles.enabled = 'no' as unknown as boolean;

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('obstacles.enabled must be a boolean'))).toBe(true);
    });

    it('rejects inverted orb vertical range (minY > maxY)', () => {
      const campaign = createValidCampaign();
      campaign.levels['lvl-1'].gameplay.orbs = {
        spawnChance: 0.4,
        minY: 500,
        maxY: 200,
      };

      const result = validateCampaignDefinition(campaign);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('orbs.maxY must be greater than or equal to orbs.minY'))).toBe(true);
    });
  });
});
