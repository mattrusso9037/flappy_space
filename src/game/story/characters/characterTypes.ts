/**
 * Canonical Character and Portrait Types
 *
 * In Flappy Spaceman, the dialogue cast is strictly:
 * - Astronaut (Atom, characterId: 'astronaut')
 * - AI (Artimus, characterId: 'ai')
 */

export const CharacterIds = {
  ASTRONAUT: 'astronaut',
  AI: 'ai',
} as const;

export type CharacterId = (typeof CharacterIds)[keyof typeof CharacterIds];

/** Shared semantic expression vocabulary. Character portrait adapters decide how
 * each expression is rendered and which expressions are supported. */
export type EmotionId =
  | 'neutral'
  | 'curious'
  | 'happy'
  | 'excited'
  | 'puzzled'
  | 'alert'
  | 'love'
  | 'sad'
  | 'angry'
  | 'sleepy'
  | 'wink'
  | 'nervous'
  | 'cool';

/** @deprecated Use EmotionId for authored dialogue content. */
export type AstronautEmotion = EmotionId;
/** @deprecated Use EmotionId for authored dialogue content. */
export type PortraitId = EmotionId;

export const EMOTION_IDS: readonly EmotionId[] = [
  'neutral', 'curious', 'happy', 'excited', 'puzzled', 'alert', 'love',
  'sad', 'angry', 'sleepy', 'wink', 'nervous', 'cool',
];

export interface CharacterDefinition {
  id: CharacterId;
  defaultName: string;
  nameVariableKey: 'astronautName' | 'aiName';
  defaultEmotion: EmotionId;
  supportedEmotions: readonly EmotionId[];
}
