/**
 * Story preview registry tests.
 *
 * Verify that the production dialogue, cutscene, and video registries
 * resolve real IDs correctly and fail safely for missing IDs.
 * These are the same registries used by story-preview.html.
 */
import { describe, it, expect } from 'vitest';
import { getDialogue, getAllDialogues } from '../game/story/dialogue/dialogues';
import { getCutscene, getAllCutscenes } from '../game/story/cutscenes/cutscenes';
import { getVideoCutscene, getAllVideoCutscenes } from '../game/story/video/videoCutscenes';
import { DialogueDefinition } from '../game/story/dialogue/dialogueTypes';
import { CutsceneDefinition } from '../game/story/cutscenes/cutsceneTypes';
import { VideoCutsceneDefinition } from '../game/story/video/videoCutsceneTypes';

describe('Story Preview — production registries', () => {
  // -------------------------------------------------------------------------
  // Dialogue registry
  // -------------------------------------------------------------------------

  it('getDialogue("unknown-signal") resolves from production registry', () => {
    const def = getDialogue('unknown-signal');
    expect(def).toBeDefined();
    expect(def?.id).toBe('unknown-signal');
    expect(def?.lines.length).toBeGreaterThan(0);
  });

  it('getDialogue("lunar-arrival") resolves from production registry', () => {
    const def = getDialogue('lunar-arrival');
    expect(def).toBeDefined();
    expect(def?.id).toBe('lunar-arrival');
  });

  it('getDialogue with invalid ID returns undefined (safe failure)', () => {
    const def = getDialogue('missing-dialogue-id');
    expect(def).toBeUndefined();
  });

  it('getAllDialogues() returns at least the built-in dialogues', () => {
    const all: DialogueDefinition[] = getAllDialogues();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((d: DialogueDefinition) => d.id === 'unknown-signal')).toBe(true);
    expect(all.some((d: DialogueDefinition) => d.id === 'lunar-arrival')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Cutscene registry
  // -------------------------------------------------------------------------

  it('getCutscene("first-signal") resolves from production registry', () => {
    const def = getCutscene('first-signal');
    expect(def).toBeDefined();
    expect(def?.id).toBe('first-signal');
    expect(def?.steps.length).toBeGreaterThan(0);
  });

  it('getCutscene with invalid ID returns undefined (safe failure)', () => {
    const def = getCutscene('missing-cutscene-id');
    expect(def).toBeUndefined();
  });

  it('getAllCutscenes() returns at least the built-in first-signal cutscene', () => {
    const all: CutsceneDefinition[] = getAllCutscenes();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((c: CutsceneDefinition) => c.id === 'first-signal')).toBe(true);
  });

  it('first-signal cutscene contains a camera step', () => {
    const def = getCutscene('first-signal');
    expect(def?.steps.some(s => s.type === 'camera')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Video registry
  // -------------------------------------------------------------------------

  it('getVideoCutscene("opening-transmission") resolves from production registry', () => {
    const def = getVideoCutscene('opening-transmission');
    expect(def).toBeDefined();
    expect(def?.id).toBe('opening-transmission');
    expect(def?.src).toBeTruthy();
  });

  it('getVideoCutscene with invalid ID returns undefined (safe failure)', () => {
    const def = getVideoCutscene('missing-video-id');
    expect(def).toBeUndefined();
  });

  it('getAllVideoCutscenes() returns at least the built-in opening-transmission', () => {
    const all: VideoCutsceneDefinition[] = getAllVideoCutscenes();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((v: VideoCutsceneDefinition) => v.id === 'opening-transmission')).toBe(true);
  });
});
