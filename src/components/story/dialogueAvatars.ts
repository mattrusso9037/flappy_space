import { AstronautEmotion } from '../../game/story/characters/characterTypes';

export type { AstronautEmotion };

export interface HeadshotCoordinates {
  col: number;
  row: number;
  backgroundPosition: string;
}

/**
 * Grid coordinates in astronaut-headshots.png (6 columns x 2 rows):
 * Row 0:
 *   Col 0: happy
 *   Col 1: excited
 *   Col 2: neutral / curious
 *   Col 3: puzzled
 *   Col 4: alert
 *   Col 5: love
 * Row 1:
 *   Col 0: sad
 *   Col 1: angry
 *   Col 2: sleepy
 *   Col 3: wink
 *   Col 4: nervous
 *   Col 5: cool
 */
export const EMOTION_COORDINATES: Record<AstronautEmotion, { col: number; row: number }> = {
  // Row 0
  happy: { col: 0, row: 0 },
  excited: { col: 1, row: 0 },
  neutral: { col: 2, row: 0 },
  curious: { col: 2, row: 0 },
  puzzled: { col: 3, row: 0 },
  alert: { col: 4, row: 0 },
  love: { col: 5, row: 0 },

  // Row 1
  sad: { col: 0, row: 1 },
  angry: { col: 1, row: 1 },
  sleepy: { col: 2, row: 1 },
  wink: { col: 3, row: 1 },
  nervous: { col: 4, row: 1 },
  cool: { col: 5, row: 1 },
};

/**
 * Resolves the public asset URL for astronaut-headshots.png.
 */
export function getAstronautHeadshotUrl(): string {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}assets/astronaut/astronaut-headshots.png`;
}

/**
 * Resolves the sprite sheet background position for an astronaut emotion.
 * Falls back to neutral (col 2, row 0) if unspecified or unrecognized.
 */
export function getAstronautHeadshotCoordinates(emotion?: AstronautEmotion): HeadshotCoordinates {
  const coords = (emotion && EMOTION_COORDINATES[emotion]) || EMOTION_COORDINATES.neutral;
  const xPercent = (coords.col * 100) / 5;
  const yPercent = coords.row * 100;

  return {
    col: coords.col,
    row: coords.row,
    backgroundPosition: `${xPercent}% ${yPercent}%`,
  };
}
