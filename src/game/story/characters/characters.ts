import { CharacterDefinition, CharacterId, CharacterIds } from './characterTypes';

/**
 * Centralized character definitions for Flappy Spaceman.
 * Cast is strictly the Astronaut and AI.
 */
export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  [CharacterIds.ASTRONAUT]: {
    id: CharacterIds.ASTRONAUT,
    defaultName: 'Atom',
    nameVariableKey: 'astronautName',
    resolveName: (variables) => variables?.astronautName ?? 'Atom',
  },
  [CharacterIds.AI]: {
    id: CharacterIds.AI,
    defaultName: 'AI',
    nameVariableKey: 'aiName',
    resolveName: (variables) => variables?.aiName ?? 'Artimus',
  },
};

export function getCharacter(id: CharacterId): CharacterDefinition {
  return CHARACTERS[id];
}

export function isCharacterId(id: unknown): id is CharacterId {
  return typeof id === 'string' && (id === CharacterIds.ASTRONAUT || id === CharacterIds.AI);
}

export function getAllCharacters(): CharacterDefinition[] {
  return Object.values(CHARACTERS);
}
