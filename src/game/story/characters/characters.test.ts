import { describe, it, expect } from 'vitest';
import {
  getCharacter,
  getAllCharacters,
  isCharacterId,
} from './characters';
import { CharacterIds } from './characterTypes';

describe('Characters Registry', () => {
  it('contains exactly two canonical characters: astronaut and ai', () => {
    const characters = getAllCharacters();
    expect(characters.length).toBe(2);
    expect(characters.map((c) => c.id)).toEqual(['astronaut', 'ai']);
  });

  it('provides default names and variable keys', () => {
    const astronaut = getCharacter(CharacterIds.ASTRONAUT);
    expect(astronaut.defaultName).toBe('Atom');
    expect(astronaut.nameVariableKey).toBe('astronautName');
    expect(astronaut.resolveName()).toBe('Atom');
    expect(astronaut.resolveName({ astronautName: 'Neil' })).toBe('Neil');

    const ai = getCharacter(CharacterIds.AI);
    expect(ai.defaultName).toBe('AI');
    expect(ai.nameVariableKey).toBe('aiName');
    expect(ai.resolveName()).toBe('Artimus');
    expect(ai.resolveName({ aiName: 'JARVIS' })).toBe('JARVIS');
  });

  it('validates character IDs with type guard', () => {
    expect(isCharacterId('astronaut')).toBe(true);
    expect(isCharacterId('ai')).toBe(true);
    expect(isCharacterId('pilot')).toBe(false);
    expect(isCharacterId('control')).toBe(false);
    expect(isCharacterId(undefined)).toBe(false);
  });
});
