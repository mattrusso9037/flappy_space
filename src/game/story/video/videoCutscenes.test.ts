import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerVideoCutscene,
  getVideoCutscene,
  hasVideoCutscene,
  getAllVideoCutscenes,
  clearVideoCutsceneRegistry,
  validateVideoCutsceneDefinition,
  OPENING_TRANSMISSION_VIDEO,
} from './videoCutscenes';

describe('Video Cutscene Registry', () => {
  beforeEach(() => {
    clearVideoCutsceneRegistry();
  });

  it('provides default registered video cutscenes', () => {
    expect(hasVideoCutscene('opening-transmission')).toBe(true);
    const video = getVideoCutscene('opening-transmission');
    expect(video).toBeDefined();
    expect(video?.src).toBe('/cutscenes/opening-transmission.mp4');
    expect(video?.skippable).toBe(true);
  });

  it('allows registering custom video definitions', () => {
    registerVideoCutscene({
      id: 'custom-cinematic',
      src: '/cutscenes/custom.mp4',
      poster: '/cutscenes/custom.jpg',
      skippable: false,
    });

    expect(hasVideoCutscene('custom-cinematic')).toBe(true);
    const custom = getVideoCutscene('custom-cinematic');
    expect(custom?.src).toBe('/cutscenes/custom.mp4');
    expect(custom?.skippable).toBe(false);
  });

  it('returns all registered video definitions', () => {
    const all = getAllVideoCutscenes();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.map(v => v.id)).toContain('opening-transmission');
  });

  it('validates video definitions accurately', () => {
    const validErrors = validateVideoCutsceneDefinition(OPENING_TRANSMISSION_VIDEO);
    expect(validErrors).toEqual([]);

    const invalidErrors = validateVideoCutsceneDefinition({
      id: '',
      src: '',
    });
    expect(invalidErrors.length).toBeGreaterThan(0);
  });
});
