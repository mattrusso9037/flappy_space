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

  // -------------------------------------------------------------------------
  // Camera: sequential interpolation from current state
  // -------------------------------------------------------------------------

  it('sequential camera steps interpolate from previous camera state, not from origin', () => {
    const cameraChanges: Array<{ x: number; y: number; zoom: number }> = [];
    const runner = new CutsceneRunner({
      onCameraChange: (cam) => cameraChanges.push({ x: cam.x ?? 0, y: cam.y ?? 0, zoom: cam.zoom ?? 1 }),
    });

    const cutscene: CutsceneDefinition = {
      id: 'sequential-cam',
      steps: [
        // Step 0: pan to x=100 over 1s (from neutral x=0)
        { type: 'camera', action: { x: 100, y: 0, zoom: 1 }, duration: 1.0 },
        // Step 1: from x=100, return to x=0 (neutral) over 1s
        { type: 'camera', action: { x: 0, y: 0, zoom: 1 }, duration: 1.0 },
      ],
    };

    runner.start(cutscene);

    // Complete step 0 — camera arrives at x=100
    runner.update(1.0);
    expect(runner.getCamera().x).toBeCloseTo(100, 2);

    // Halfway through step 1 — should interpolate from x=100 toward x=0 → x≈50
    runner.update(0.5);
    expect(runner.getCamera().x).toBeCloseTo(50, 1);

    // Complete step 1 — should land at x=0
    runner.update(0.5);
    expect(runner.getCamera().x).toBeCloseTo(0, 2);
  });

  it('neutral camera step (x=0, y=0, zoom=1) produces no visible transform', () => {
    const onCameraChange = vi.fn();
    const runner = new CutsceneRunner({ onCameraChange });

    const cutscene: CutsceneDefinition = {
      id: 'neutral-cam',
      steps: [{ type: 'camera', action: { x: 0, y: 0, zoom: 1 }, duration: 0.5 }],
    };

    runner.start(cutscene);
    runner.update(0.25);

    const cam = runner.getCamera();
    expect(cam.x).toBeCloseTo(0, 5);
    expect(cam.y).toBeCloseTo(0, 5);
    expect(cam.zoom).toBeCloseTo(1, 5);
  });

  it('skip restores neutral camera via onCameraChange callback', () => {
    const cameraValues: Array<{ x: number; y: number; zoom: number }> = [];
    const runner = new CutsceneRunner({
      onCameraChange: (cam) => cameraValues.push({ x: cam.x ?? 0, y: cam.y ?? 0, zoom: cam.zoom ?? 1 }),
    });

    const cutscene: CutsceneDefinition = {
      id: 'skip-cam',
      steps: [
        { type: 'camera', action: { x: 80, y: -40, zoom: 1.3 }, duration: 2.0 },
        { type: 'wait', duration: 3.0 },
      ],
    };

    runner.start(cutscene);
    runner.update(1.0); // camera is mid-pan — x should be ~40

    expect(runner.getCamera().x).toBeGreaterThan(0);

    runner.skip();

    // Neutral camera must be emitted and stored
    expect(runner.getCamera().x).toBe(0);
    expect(runner.getCamera().y).toBe(0);
    expect(runner.getCamera().zoom).toBe(1);

    const lastCam = cameraValues[cameraValues.length - 1];
    expect(lastCam.x).toBe(0);
    expect(lastCam.y).toBe(0);
    expect(lastCam.zoom).toBe(1);
  });

  it('camera interpolation mid-zoom uses eased linear progress', () => {
    const onCameraChange = vi.fn();
    const runner = new CutsceneRunner({ onCameraChange });

    const cutscene: CutsceneDefinition = {
      id: 'zoom-cam',
      steps: [{ type: 'camera', action: { x: 0, y: 0, zoom: 1.5 }, duration: 1.0 }],
    };

    runner.start(cutscene);
    runner.update(0.5); // 50% through

    const cam = runner.getCamera();
    // Linear interpolation: zoom = 1 + (1.5 - 1) * 0.5 = 1.25
    expect(cam.zoom).toBeCloseTo(1.25, 2);
  });
});
