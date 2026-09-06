import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCutscene,
  getCutscene,
  hasCutscene,
  getAllCutscenes,
  clearCutsceneRegistry,
  validateCutsceneDefinition,
  FIRST_SIGNAL_CUTSCENE,
  MATTER_GUN_DISCOVERY_CUTSCENE,
} from './cutscenes';

describe('Cutscene Registry', () => {
  beforeEach(() => {
    clearCutsceneRegistry();
  });

  it('provides default registered cutscenes', () => {
    expect(hasCutscene('first-signal')).toBe(true);
    expect(hasCutscene('opening-spacewalk')).toBe(true);
    expect(hasCutscene('matter-gun-discovery')).toBe(true);

    const cutscene = getCutscene('matter-gun-discovery');
    expect(cutscene).toBeDefined();
    expect(cutscene?.steps.length).toBe(8);
    expect(cutscene?.steps[0]).toEqual({ type: 'music', musicId: 'weightless-space' });
    expect(cutscene?.steps[1].type).toBe('scene');
    if (cutscene?.steps[1].type === 'scene') {
      expect(cutscene.steps[1].scene.backdrop).toBe('surface');
      expect(cutscene.steps[1].scene.actors.some(a => a.kind === 'pilot')).toBe(true);
      expect(cutscene.steps[1].scene.actors.some(a => a.kind === 'matter-gun')).toBe(true);
    }
    expect(cutscene?.steps[5]).toEqual({ type: 'dialogue', dialogueId: 'matter-gun-found' });
  });

  it('validates canonical cutscene definitions without errors', () => {
    expect(validateCutsceneDefinition(FIRST_SIGNAL_CUTSCENE)).toEqual([]);
    expect(validateCutsceneDefinition(MATTER_GUN_DISCOVERY_CUTSCENE)).toEqual([]);
  });

  it('allows registering custom cutscenes', () => {
    registerCutscene({
      id: 'custom-cutscene',
      steps: [
        { type: 'wait', duration: 1.0 },
      ],
    });

    expect(hasCutscene('custom-cutscene')).toBe(true);
    expect(getCutscene('custom-cutscene')?.steps).toHaveLength(1);
  });

  it('detects invalid cutscene definitions', () => {
    const emptyErrors = validateCutsceneDefinition({ id: '', steps: [] });
    expect(emptyErrors.length).toBeGreaterThan(0);

    const invalidStepErrors = validateCutsceneDefinition({
      id: 'invalid-steps',
      steps: [
        { type: 'dialogue', dialogueId: 'non-existent-dialogue' },
        { type: 'wait', duration: -1 },
        { type: 'fade', direction: 'invalid' as unknown as 'in', duration: 0 },
      ],
    });
    expect(invalidStepErrors.some(e => e.includes('unregistered dialogue'))).toBe(true);
    expect(invalidStepErrors.some(e => e.includes('duration must be a positive number'))).toBe(true);
  });

  it('returns all registered cutscenes', () => {
    const all = getAllCutscenes();
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.map(c => c.id)).toContain('matter-gun-discovery');
  });
});
