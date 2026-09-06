import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMPAIGN, SECTOR_02 } from './defaultCampaign';
import { LevelGameplayDefinition } from './campaignTypes';
import { validateCampaignDefinition } from './validateCampaign';

const validate = (change: (gameplay: LevelGameplayDefinition) => void) => {
  const campaign = structuredClone(DEFAULT_CAMPAIGN);
  change(campaign.levels[SECTOR_02.id].gameplay);
  return validateCampaignDefinition(campaign);
};

describe('authored terrain and shovel validation', () => {
  it('accepts the puzzle, shovel-only equipment, and terrain without tools', () => {
    expect(validate(() => {}).valid).toBe(true);
    expect(validate(g => { g.tools = { equipped: 'shovel', shovel: { reach: 40 } }; }).valid).toBe(true);
    expect(validate(g => { delete g.tools; }).valid).toBe(true);
  });

  it('requires equipped shovel configuration and positive finite reach', () => {
    expect(validate(g => { g.tools = { equipped: 'shovel' }; }).valid).toBe(false);
    for (const reach of [0, -1, NaN, Infinity]) {
      expect(validate(g => { g.tools!.shovel = { reach }; }).valid).toBe(false);
    }
  });

  it('requires ground, ground movement and a world independently of tools', () => {
    for (const key of ['ground', 'world', 'movement'] as const) {
      expect(validate(g => { delete g.tools; delete g[key]; }).valid).toBe(false);
    }
  });

  it('rejects invalid geometry and below-ground blocks', () => {
    for (const bounds of [
      { x: NaN, y: 420, width: 60, height: 100 },
      { x: 1100, y: Infinity, width: 60, height: 100 },
      { x: -1, y: 420, width: 60, height: 100 },
      { x: 1100, y: -1, width: 60, height: 100 },
      { x: 2390, y: 420, width: 60, height: 100 },
      { x: 1100, y: 420, width: 0, height: 100 },
      { x: 1100, y: 420, width: 60, height: 101 },
    ]) {
      expect(validate(g => { g.terrainBlocks = [{ id: 'plug', bounds, diggable: true }]; }).valid).toBe(false);
    }
  });

  it('rejects duplicate IDs, overlap, spawn obstruction and pickup overlap', () => {
    const block = SECTOR_02.gameplay.terrainBlocks![1];
    expect(validate(g => { g.terrainBlocks = [block, block]; }).valid).toBe(false);
    expect(validate(g => { g.terrainBlocks = [block, { ...block, id: 'other' }]; }).valid).toBe(false);
    for (const bounds of [
      { x: 140, y: 240, width: 60, height: 100 },
      { x: 690, y: 280, width: 60, height: 100 },
    ]) {
      expect(validate(g => { g.terrainBlocks = [{ id: 'block', bounds, diggable: true }]; }).valid).toBe(false);
    }
  });

  it('fails safely on malformed external authoring data', () => {
    for (const value of [null, {}, [null], [{ id: 'bad' }], [
      { id: 'bad', bounds: { x: 1100, y: 420, width: 60, height: 100 } },
    ]]) {
      expect(validate(g => { Object.assign(g, { terrainBlocks: value }); }).valid).toBe(false);
    }
  });
});
