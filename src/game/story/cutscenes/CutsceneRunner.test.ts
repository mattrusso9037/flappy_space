import { describe, it, expect, vi } from 'vitest';
import { CutsceneRunner } from './CutsceneRunner';
import { CutsceneDefinition } from './cutsceneTypes';

describe('CutsceneRunner', () => {
  it('executes wait steps sequentially using simulation time', () => {
    const onComplete = vi.fn();
    const runner = new CutsceneRunner({ onComplete });

    const cutscene: CutsceneDefinition = {
      id: 'test-cutscene',
      steps: [
        { type: 'wait', duration: 1.0 },
        { type: 'wait', duration: 0.5 },
      ],
    };

    runner.start(cutscene);
    expect(runner.isActive()).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    // Advance 0.5s (in step 0)
    runner.update(0.5);
    expect(runner.getCurrentStep()?.type).toBe('wait');
    expect(onComplete).not.toHaveBeenCalled();

    // Advance another 0.6s (should finish step 0 and enter step 1)
    runner.update(0.6);
    expect(runner.getCurrentStep()?.type).toBe('wait');
    expect(onComplete).not.toHaveBeenCalled();

    // Advance 0.5s (should finish step 1 and complete cutscene)
    runner.update(0.5);
    expect(runner.isActive()).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('pauses and resumes without losing elapsed step time', () => {
    const onComplete = vi.fn();
    const runner = new CutsceneRunner({ onComplete });

    const cutscene: CutsceneDefinition = {
      id: 'test-pause',
      steps: [{ type: 'wait', duration: 1.0 }],
    };

    runner.start(cutscene);
    runner.update(0.5);
    runner.pause();
    expect(runner.getIsPaused()).toBe(true);

    // Updates while paused should be ignored
    runner.update(1.0);
    expect(onComplete).not.toHaveBeenCalled();

    runner.resume();
    expect(runner.getIsPaused()).toBe(false);

    // Remaining 0.5s needed
    runner.update(0.4);
    expect(onComplete).not.toHaveBeenCalled();

    runner.update(0.2);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('pauses cutscene advancement during embedded dialogue and resumes on completeDialogue', () => {
    const onDialogueStart = vi.fn();
    const onComplete = vi.fn();
    const runner = new CutsceneRunner({ onDialogueStart, onComplete });

    const cutscene: CutsceneDefinition = {
      id: 'dialogue-cutscene',
      steps: [
        { type: 'wait', duration: 0.2 },
        { type: 'dialogue', dialogueId: 'unknown-signal' },
        { type: 'wait', duration: 0.3 },
      ],
    };

    runner.start(cutscene);
    runner.update(0.2);

    expect(runner.getActiveDialogueId()).toBe('unknown-signal');
    expect(onDialogueStart).toHaveBeenCalledWith('unknown-signal');

    // Updating during dialogue does not auto-advance past it
    runner.update(5.0);
    expect(runner.getActiveDialogueId()).toBe('unknown-signal');
    expect(onComplete).not.toHaveBeenCalled();

    // Completing dialogue resumes cutscene
    runner.completeDialogue();
    expect(runner.getActiveDialogueId()).toBeNull();

    // Now in final wait step
    runner.update(0.3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('handles camera actions and fade interpolation smoothly', () => {
    const onFadeChange = vi.fn();
    const onCameraChange = vi.fn();
    const runner = new CutsceneRunner({ onFadeChange, onCameraChange });

    const cutscene: CutsceneDefinition = {
      id: 'cinematic-fx',
      steps: [
        { type: 'fade', direction: 'out', duration: 1.0 },
        { type: 'camera', action: { x: 50, y: -25, zoom: 1.2 }, duration: 1.0 },
      ],
    };

    runner.start(cutscene);

    // Halfway through fade out
    runner.update(0.5);
    expect(runner.getFadeAlpha()).toBeCloseTo(0.5, 2);

    // Complete fade out
    runner.update(0.5);
    expect(runner.getFadeAlpha()).toBeCloseTo(1.0, 2);

    // Halfway through camera
    runner.update(0.5);
    const cam = runner.getCamera();
    expect(cam.x).toBeCloseTo(25, 2);
    expect(cam.y).toBeCloseTo(-12.5, 2);
    expect(cam.zoom).toBeCloseTo(1.1, 2);
  });

  it('skipping cutscene cleans up transforms and completes once', () => {
    const onComplete = vi.fn();
    const onFadeChange = vi.fn();
    const runner = new CutsceneRunner({ onComplete, onFadeChange });

    const cutscene: CutsceneDefinition = {
      id: 'long-cutscene',
      steps: [
        { type: 'fade', direction: 'out', duration: 2.0 },
        { type: 'wait', duration: 5.0 },
      ],
    };

    runner.start(cutscene);
    runner.update(1.0);
    expect(runner.isActive()).toBe(true);

    runner.skip();

    expect(runner.isActive()).toBe(false);
    expect(runner.getFadeAlpha()).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Calling skip again is idempotent
    runner.skip();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
