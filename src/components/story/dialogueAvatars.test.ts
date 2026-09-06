import { describe, it, expect } from 'vitest';
import {
  getAstronautHeadshotCoordinates,
  getAstronautHeadshotUrl,
  EMOTION_COORDINATES,
  getCharacterPortraitAdapter,
} from './dialogueAvatars';

describe('dialogueAvatars', () => {
  it('resolves the default astronaut headshot URL', () => {
    const url = getAstronautHeadshotUrl();
    expect(url).toContain('assets/astronaut/astronaut-headshots.png');
  });

  it('maps all defined emotions to valid coordinates', () => {
    Object.keys(EMOTION_COORDINATES).forEach((emotion) => {
      const coords = getAstronautHeadshotCoordinates(emotion as Parameters<typeof getAstronautHeadshotCoordinates>[0]);
      expect(coords.col).toBeGreaterThanOrEqual(0);
      expect(coords.col).toBeLessThanOrEqual(5);
      expect(coords.row).toBeGreaterThanOrEqual(0);
      expect(coords.row).toBeLessThanOrEqual(1);
    });
  });

  it('resolves coordinates for row 0 emotions', () => {
    expect(getAstronautHeadshotCoordinates('happy').backgroundPosition).toBe('0% 0%');
    expect(getAstronautHeadshotCoordinates('excited').backgroundPosition).toBe('20% 0%');
    expect(getAstronautHeadshotCoordinates('neutral').backgroundPosition).toBe('40% 0%');
    expect(getAstronautHeadshotCoordinates('puzzled').backgroundPosition).toBe('60% 0%');
    expect(getAstronautHeadshotCoordinates('alert').backgroundPosition).toBe('80% 0%');
    expect(getAstronautHeadshotCoordinates('love').backgroundPosition).toBe('100% 0%');
  });

  it('resolves coordinates for row 1 emotions', () => {
    expect(getAstronautHeadshotCoordinates('sad').backgroundPosition).toBe('0% 100%');
    expect(getAstronautHeadshotCoordinates('angry').backgroundPosition).toBe('20% 100%');
    expect(getAstronautHeadshotCoordinates('sleepy').backgroundPosition).toBe('40% 100%');
    expect(getAstronautHeadshotCoordinates('wink').backgroundPosition).toBe('60% 100%');
    expect(getAstronautHeadshotCoordinates('nervous').backgroundPosition).toBe('80% 100%');
    expect(getAstronautHeadshotCoordinates('cool').backgroundPosition).toBe('100% 100%');
  });

  it('falls back to neutral when emotion is undefined or unrecognized', () => {
    expect(getAstronautHeadshotCoordinates(undefined).backgroundPosition).toBe('40% 0%');
    expect(getAstronautHeadshotCoordinates('unknown-emotion' as Parameters<typeof getAstronautHeadshotCoordinates>[0]).backgroundPosition).toBe('40% 0%');
  });

  it('uses a separate portrait adapter for each character', () => {
    const astronaut = getCharacterPortraitAdapter('astronaut').resolve('puzzled');
    const ai = getCharacterPortraitAdapter('ai').resolve('puzzled');

    expect(astronaut.kind).toBe('headshot-grid');
    expect(ai.kind).toBe('ai-core');
    if (astronaut.kind === 'headshot-grid') {
      expect(astronaut.coordinates.backgroundPosition).toBe('60% 0%');
    }
    if (ai.kind === 'ai-core') {
      expect(ai.emotion).toBe('puzzled');
    }
  });
});
