import { describe, expect, it } from 'vitest';
import { DEFAULT_CAMPAIGN, SECTOR_02 } from './defaultCampaign';
import { validateCampaignDefinition } from './validateCampaign';
import { LevelGameplayDefinition } from './campaignTypes';

const validate = (change: (gameplay: LevelGameplayDefinition) => void) => {
  const campaign = structuredClone(DEFAULT_CAMPAIGN);
  change(campaign.levels[SECTOR_02.id].gameplay);
  return validateCampaignDefinition(campaign);
};

describe('player tool authoring contract', () => {
  it('validates the authored campaign and an unequipped starting tool', () => {
    expect(validateCampaignDefinition(DEFAULT_CAMPAIGN)).toEqual({ valid: true, errors: [] });
    expect(validate(g => { g.tools!.equipped = null; }).valid).toBe(true);
  });
  it.each(['width', 'height', 'lifetimeSeconds', 'maxActive'] as const)('rejects invalid %s', key => {
    for (const value of [0, -1, NaN, Infinity]) {
      expect(validate(g => { g.tools!.wallBuilder![key] = value; }).valid).toBe(false);
    }
  });
  it('rejects fractional limits and oversized panels', () => {
    expect(validate(g => { g.tools!.wallBuilder!.maxActive = 1.5; }).valid).toBe(false);
    expect(validate(g => { g.tools!.wallBuilder!.width = 3000; }).valid).toBe(false);
    expect(validate(g => { g.tools!.wallBuilder!.height = 600; }).valid).toBe(false);
  });
  it('validates grapple-only tools and rejects malformed anchors and tuning', () => {
    expect(validate(g => { delete g.tools!.wallBuilder; g.tools!.equipped = 'grapple-hook'; }).valid).toBe(true);
    for (const value of [0, -1, NaN, Infinity]) {
      expect(validate(g => { g.tools!.grappleHook!.range = value; }).valid).toBe(false);
      expect(validate(g => { g.tools!.grappleHook!.pullSpeed = value; }).valid).toBe(false);
    }
    expect(validate(g => { g.tools!.grappleHook!.anchors = []; }).valid).toBe(false);
    expect(validate(g => { g.tools!.grappleHook!.anchors = [{ id: 'a', x: NaN, y: 50 }]; }).valid).toBe(false);
    expect(validate(g => { g.tools!.grappleHook!.anchors = [{ id: 'a', x: 50, y: 50 }, { id: 'a', x: 60, y: 50 }]; }).valid).toBe(false);
  });
  it('requires ground movement and natural ground', () => {
    expect(validate(g => { delete g.ground; }).valid).toBe(false);
    expect(validate(g => { g.movement = { mode: 'flight' }; }).valid).toBe(false);
  });
  it('validates authored pickups against world and ground bounds', () => {
    for (const point of [{ x: NaN, y: 300 }, { x: 300, y: Infinity }, { x: -20, y: 300 }, { x: 2500, y: 300 }, { x: 300, y: 510 }]) {
      expect(validate(g => { g.orbs.placements = [point]; }).valid).toBe(false);
    }
    expect(validate(g => { delete g.world; }).valid).toBe(false);
  });
});
