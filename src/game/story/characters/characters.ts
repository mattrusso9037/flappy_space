import {
  CharacterDefinition,
  CharacterId,
  CharacterIds,
  EMOTION_IDS,
  EmotionId,
} from './characterTypes';

const SHARED_EMOTIONS: readonly EmotionId[] = EMOTION_IDS;

/**
 * Centralized character definitions for Flappy Spaceman.
 * Cast is strictly the Astronaut and AI.
 */
export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  [CharacterIds.ASTRONAUT]: {
    id: CharacterIds.ASTRONAUT,
    defaultName: 'Atom',
    nameVariableKey: 'astronautName',
    defaultEmotion: 'neutral',
    supportedEmotions: SHARED_EMOTIONS,
  },
  [CharacterIds.AI]: {
    id: CharacterIds.AI,
    defaultName: 'Artimus',
    nameVariableKey: 'aiName',
    defaultEmotion: 'neutral',
    supportedEmotions: SHARED_EMOTIONS,
  },
};

export function getCharacter(id: CharacterId): CharacterDefinition {
  return CHARACTERS[id];
}

export function resolveCharacterName(
  id: CharacterId,
  variables?: { astronautName?: string; aiName?: string }
): string {
  const character = getCharacter(id);
  return variables?.[character.nameVariableKey] ?? character.defaultName;
}

export function isCharacterId(id: unknown): id is CharacterId {
  return typeof id === 'string' && (id === CharacterIds.ASTRONAUT || id === CharacterIds.AI);
}

export function getAllCharacters(): CharacterDefinition[] {
  return Object.values(CHARACTERS);
}

export function supportsCharacterEmotion(id: CharacterId, emotion: EmotionId): boolean {
  return getCharacter(id).supportedEmotions.includes(emotion);
}
