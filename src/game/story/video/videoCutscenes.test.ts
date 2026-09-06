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

  it('starts with an empty registry so unavailable media is not promised', () => {
    expect(getAllVideoCutscenes()).toEqual([]);
    expect(hasVideoCutscene('opening-transmission')).toBe(false);
    expect(getVideoCutscene('opening-transmission')).toBeUndefined();
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

  it('returns all registered video definitions and clears registry cleanly', () => {
    registerVideoCutscene({ id: 'video-1', src: '/cutscenes/v1.mp4' });
    registerVideoCutscene({ id: 'video-2', src: '/cutscenes/v2.mp4' });

    const all = getAllVideoCutscenes();
    expect(all.length).toBe(2);
    expect(all.map(v => v.id)).toEqual(['video-1', 'video-2']);

    clearVideoCutsceneRegistry();
    expect(getAllVideoCutscenes()).toEqual([]);
    expect(hasVideoCutscene('video-1')).toBe(false);
  });

  it('validates video definitions accurately (structural checks)', () => {
    const validErrors = validateVideoCutsceneDefinition(OPENING_TRANSMISSION_VIDEO);
    expect(validErrors).toEqual([]);

    const invalidErrors = validateVideoCutsceneDefinition({
      id: '',
      src: '',
    });
    expect(invalidErrors.length).toBeGreaterThanOrEqual(2);
    expect(invalidErrors.some(e => e.includes('non-empty string id'))).toBe(true);
    expect(invalidErrors.some(e => e.includes('non-empty string src URL'))).toBe(true);
  });

  it('fails validation when asset verification indicates source or poster is missing', () => {
    const missingSourceErrors = validateVideoCutsceneDefinition(
      {
        id: 'missing-asset-video',
        src: '/cutscenes/missing.mp4',
        poster: '/cutscenes/valid-poster.jpg',
      },
      {
        assetExists: (path) => path === '/cutscenes/valid-poster.jpg',
      }
    );
    expect(missingSourceErrors.length).toBe(1);
    expect(missingSourceErrors[0]).toContain('source asset not found: "/cutscenes/missing.mp4"');

    const missingPosterErrors = validateVideoCutsceneDefinition(
      {
        id: 'missing-poster-video',
        src: '/cutscenes/valid.mp4',
        poster: '/cutscenes/missing-poster.jpg',
      },
      {
        assetExists: (path) => path === '/cutscenes/valid.mp4',
      }
    );
    expect(missingPosterErrors.length).toBe(1);
    expect(missingPosterErrors[0]).toContain('poster asset not found: "/cutscenes/missing-poster.jpg"');
  });

  it('passes validation when asset verification confirms files exist', () => {
    const errors = validateVideoCutsceneDefinition(
      {
        id: 'real-asset-video',
        src: '/cutscenes/existing.mp4',
        poster: '/cutscenes/existing.jpg',
      },
      {
        assetExists: () => true,
      }
    );
    expect(errors).toEqual([]);
  });
});
