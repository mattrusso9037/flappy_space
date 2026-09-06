import { describe, expect, it } from 'vitest';
import { sampleActor, SceneActor, validateScene } from './sceneTypes';
import { OPENING_SPACEWALK } from './openingSpacewalk';
import { validateCutsceneDefinition } from './cutscenes';

const actor: SceneActor = { id: 'pilot', kind: 'pilot', keyframes: [
  { time: 0, x: 0, y: 10, scale: 1, rotation: 0, alpha: 1 },
  { time: 2, x: 100, y: 50, scale: 0, rotation: 4, alpha: 0 },
] };

describe('cinematic actor tracks', () => {
  it('interpolates position, rotation, scale and opacity and clamps endpoints', () => {
    expect(sampleActor(actor, 1)).toEqual({ x: 50, y: 30, scale: 0.5, rotation: 2, alpha: 0.5 });
    expect(sampleActor(actor, -1).x).toBe(0);
    expect(sampleActor(actor, 9).x).toBe(100);
  });
  it('rejects invalid tracks, duplicate actors, and nonfinite values', () => {
    expect(validateScene({ actors: [actor] }, 2)).toEqual([]);
    expect(validateScene({ actors: [actor, actor] }, 2)).not.toEqual([]);
    for (const frame of [
      { ...actor.keyframes[1], time: 0 },
      { ...actor.keyframes[1], time: 3 },
      { ...actor.keyframes[1], x: NaN },
      { ...actor.keyframes[1], alpha: 2 },
      { ...actor.keyframes[1], scale: -1 },
    ]) {
      expect(validateScene({ actors: [{ ...actor, keyframes: [actor.keyframes[0], frame] }] }, 2)).not.toEqual([]);
    }
  });
  it('validates the registered opening and pulls the pilot into the portal before completion', () => {
    expect(validateCutsceneDefinition(OPENING_SPACEWALK)).toEqual([]);
    const step = OPENING_SPACEWALK.steps.find(s => s.type === 'scene');
    if (!step || step.type !== 'scene') throw new Error('Missing opening scene');
    const pilot = step.scene.actors.find(a => a.kind === 'pilot')!;
    const portal = step.scene.actors.find(a => a.kind === 'wormhole')!;
    expect(sampleActor(pilot, 0).alpha).toBe(1);
    expect(sampleActor(pilot, 10).alpha).toBe(0);
    expect(sampleActor(pilot, 12).x).toBe(sampleActor(portal, 12).x);
  });
});
