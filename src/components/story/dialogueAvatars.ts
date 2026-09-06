import { CharacterId, CharacterIds, EmotionId } from '../../game/story/characters/characterTypes';

export interface HeadshotCoordinates {
  col: number;
  row: number;
  backgroundPosition: string;
}

export type DialoguePortraitDescriptor =
  | {
      kind: 'headshot-grid';
      characterId: CharacterId;
      assetUrl: string;
      coordinates: HeadshotCoordinates;
    }
  | {
      kind: 'ai-core';
      characterId: CharacterId;
      emotion: EmotionId;
    };

export interface CharacterPortraitAdapter {
  characterId: CharacterId;
  resolve(emotion?: EmotionId): DialoguePortraitDescriptor;
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
export const EMOTION_COORDINATES: Record<EmotionId, { col: number; row: number }> = {
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
export function getAstronautHeadshotCoordinates(emotion?: EmotionId): HeadshotCoordinates {
  const coords = (emotion && EMOTION_COORDINATES[emotion]) || EMOTION_COORDINATES.neutral;
  const xPercent = (coords.col * 100) / 5;
  const yPercent = coords.row * 100;

  return {
    col: coords.col,
    row: coords.row,
    backgroundPosition: `${xPercent}% ${yPercent}%`,
  };
}

const ASTRONAUT_PORTRAIT_ADAPTER: CharacterPortraitAdapter = {
  characterId: CharacterIds.ASTRONAUT,
  resolve: (emotion) => ({
    kind: 'headshot-grid',
    characterId: CharacterIds.ASTRONAUT,
    assetUrl: getAstronautHeadshotUrl(),
    coordinates: getAstronautHeadshotCoordinates(emotion),
  }),
};

const AI_PORTRAIT_ADAPTER: CharacterPortraitAdapter = {
  characterId: CharacterIds.AI,
  resolve: (emotion) => ({
    kind: 'ai-core',
    characterId: CharacterIds.AI,
    emotion: emotion ?? 'neutral',
  }),
};

const PORTRAIT_ADAPTERS: Record<CharacterId, CharacterPortraitAdapter> = {
  [CharacterIds.ASTRONAUT]: ASTRONAUT_PORTRAIT_ADAPTER,
  [CharacterIds.AI]: AI_PORTRAIT_ADAPTER,
};

export function getCharacterPortraitAdapter(characterId: CharacterId): CharacterPortraitAdapter {
  return PORTRAIT_ADAPTERS[characterId];
}
