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
import {
  getVideoCutscene,
  getAllVideoCutscenes,
  registerVideoCutscene,
  clearVideoCutsceneRegistry,
} from '../game/story/video/videoCutscenes';
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

  it('getAllVideoCutscenes() returns empty array by default so unavailable media is not promised', () => {
    clearVideoCutsceneRegistry();
    const all: VideoCutsceneDefinition[] = getAllVideoCutscenes();
    expect(all).toEqual([]);
  });

  it('getVideoCutscene with unregistered ID returns undefined (safe failure)', () => {
    clearVideoCutsceneRegistry();
    expect(getVideoCutscene('opening-transmission')).toBeUndefined();
    expect(getVideoCutscene('missing-video-id')).toBeUndefined();
  });

  it('getVideoCutscene resolves dynamically registered video cutscenes', () => {
    clearVideoCutsceneRegistry();
    registerVideoCutscene({
      id: 'preview-video',
      src: '/cutscenes/preview.mp4',
    });
    const def = getVideoCutscene('preview-video');
    expect(def).toBeDefined();
    expect(def?.id).toBe('preview-video');
    expect(def?.src).toBe('/cutscenes/preview.mp4');

    clearVideoCutsceneRegistry();
  });
});
