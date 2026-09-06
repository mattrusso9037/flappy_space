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

/**
 * Visor emotions from public/assets/astronaut/astronaut-headshots.png (6x2 grid).
 */
export type AstronautEmotion =
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

export type PortraitId = AstronautEmotion;

export interface CharacterDefinition {
  id: CharacterId;
  defaultName: string;
  nameVariableKey: 'astronautName' | 'aiName';
  resolveName: (variables?: Record<string, string | undefined>) => string;
}
