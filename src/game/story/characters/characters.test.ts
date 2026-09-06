import { describe, it, expect } from 'vitest';
import {
  getCharacter,
  getAllCharacters,
  isCharacterId,
  resolveCharacterName,
  supportsCharacterEmotion,
} from './characters';
import { CharacterIds } from './characterTypes';

describe('Characters Registry', () => {
  it('contains exactly two canonical characters: astronaut and ai', () => {
    const characters = getAllCharacters();
    expect(characters.length).toBe(2);
    expect(characters.map((c) => c.id)).toEqual(['astronaut', 'ai']);
  });

  it('provides default names, variable keys and shared semantic emotions', () => {
    const astronaut = getCharacter(CharacterIds.ASTRONAUT);
    expect(astronaut.defaultName).toBe('Atom');
    expect(astronaut.nameVariableKey).toBe('astronautName');
    expect(resolveCharacterName(CharacterIds.ASTRONAUT)).toBe('Atom');
    expect(resolveCharacterName(CharacterIds.ASTRONAUT, { astronautName: 'Neil' })).toBe('Neil');
    expect(astronaut.defaultEmotion).toBe('neutral');
    expect(supportsCharacterEmotion(CharacterIds.ASTRONAUT, 'puzzled')).toBe(true);

    const ai = getCharacter(CharacterIds.AI);
    expect(ai.defaultName).toBe('Artimus');
    expect(ai.nameVariableKey).toBe('aiName');
    expect(resolveCharacterName(CharacterIds.AI)).toBe('Artimus');
    expect(resolveCharacterName(CharacterIds.AI, { aiName: 'JARVIS' })).toBe('JARVIS');
    expect(supportsCharacterEmotion(CharacterIds.AI, 'alert')).toBe(true);
  });

  it('validates character IDs with type guard', () => {
    expect(isCharacterId('astronaut')).toBe(true);
    expect(isCharacterId('ai')).toBe(true);
    expect(isCharacterId('pilot')).toBe(false);
    expect(isCharacterId('control')).toBe(false);
    expect(isCharacterId(undefined)).toBe(false);
  });
});
