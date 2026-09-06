import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MUSIC_TRACK_ID,
  getMusicCatalog,
  getMusicTrack,
  isMusicTrackId,
  resolveMusicTrack,
} from './musicCatalog';

describe('Music Catalog', () => {
  it('contains the default weightless-space track', () => {
    const catalog = getMusicCatalog();
    expect(catalog['weightless-space']).toBeDefined();
    expect(catalog['weightless-space'].name).toBe('Weightless Space');
    expect(catalog['weightless-space'].url).toContain('Weightless%20Space.mp3');
  });

  it('resolves valid music tracks by ID', () => {
    const track = getMusicTrack('weightless-space');
    expect(track).toBeDefined();
    expect(track?.id).toBe(DEFAULT_MUSIC_TRACK_ID);
  });

  it('identifies valid music track IDs with type guard', () => {
    expect(isMusicTrackId('weightless-space')).toBe(true);
    expect(isMusicTrackId('non-existent-track')).toBe(false);
  });

  it('falls back safely to default track for missing or invalid IDs', () => {
    const defaultTrack = resolveMusicTrack();
    expect(defaultTrack.id).toBe(DEFAULT_MUSIC_TRACK_ID);
    expect(resolveMusicTrack(undefined).id).toBe(DEFAULT_MUSIC_TRACK_ID);
    expect(resolveMusicTrack('').id).toBe(DEFAULT_MUSIC_TRACK_ID);
    expect(resolveMusicTrack('unknown-track').id).toBe(DEFAULT_MUSIC_TRACK_ID);
  });
});
