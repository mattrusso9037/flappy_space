import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDialogue,
  getDialogue,
  hasDialogue,
  getAllDialogues,
  clearDialogueRegistry,
  validateDialogueDefinition,
  UNKNOWN_SIGNAL_DIALOGUE,
  MATTER_GUN_FOUND_DIALOGUE,
} from './dialogues';
import { resolveDialogueText, DialogueId, DialogueIds, CharacterIds } from './dialogueTypes';

describe('Dialogue Registry', () => {
  beforeEach(() => {
    clearDialogueRegistry();
  });

  it('provides default registered dialogues with centralized DialogueIds', () => {
    expect(hasDialogue(DialogueIds.UNKNOWN_SIGNAL)).toBe(true);
    expect(hasDialogue(DialogueIds.LUNAR_ARRIVAL)).toBe(true);
    expect(hasDialogue(DialogueIds.MATTER_GUN_FOUND)).toBe(true);

    const dialogue = getDialogue(DialogueIds.UNKNOWN_SIGNAL);
    expect(dialogue).toBeDefined();
    expect(dialogue?.lines.length).toBe(3);
    expect(dialogue?.lines[0].characterId).toBe(CharacterIds.AI);

    const matterGunDialogue = getDialogue(DialogueIds.MATTER_GUN_FOUND);
    expect(matterGunDialogue).toBeDefined();
    expect(matterGunDialogue?.lines.length).toBe(4);
    expect(matterGunDialogue?.lines[0].characterId).toBe(CharacterIds.ASTRONAUT);
    expect(matterGunDialogue?.lines[0].emotion).toBe('neutral');
    expect(matterGunDialogue?.lines[0].text).toContain('matter gun');
    expect(matterGunDialogue?.lines[3].characterId).toBe(CharacterIds.AI);
  });

  it('allows registering custom dialogue definitions', () => {
    registerDialogue({
      id: 'custom-briefing',
      lines: [
        { characterId: CharacterIds.AI, text: 'Prepare for deep space jump.' },
      ],
    });

    expect(hasDialogue('custom-briefing')).toBe(true);
    const custom = getDialogue('custom-briefing');
    expect(custom?.lines[0].text).toBe('Prepare for deep space jump.');
  });

  it('returns all registered dialogues', () => {
    const all = getAllDialogues();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.map(d => d.id)).toContain(DialogueIds.UNKNOWN_SIGNAL);
  });

  it('validates dialogue definitions correctly', () => {
    const validErrors = validateDialogueDefinition(UNKNOWN_SIGNAL_DIALOGUE);
    expect(validErrors).toEqual([]);

    const matterGunErrors = validateDialogueDefinition(MATTER_GUN_FOUND_DIALOGUE);
    expect(matterGunErrors).toEqual([]);

    const invalidErrors = validateDialogueDefinition({
      id: '' as unknown as DialogueId,
      lines: [],
    });
    expect(invalidErrors.length).toBeGreaterThan(0);
    expect(invalidErrors[0]).toContain('non-empty string id');
  });

  it('detects invalid lines in dialogue definitions', () => {
    const errors = validateDialogueDefinition({
      id: 'bad-dialogue',
      lines: [
        { characterId: CharacterIds.AI, text: '' },
      ],
    });
    expect(errors.some(e => e.includes('missing valid text'))).toBe(true);
  });

  it('enforces characterId and emotion guardrails in validateDialogueDefinition', () => {
    // Valid dialogue with characterId and emotion
    const validErrors = validateDialogueDefinition({
      id: 'valid-guarded-dialogue',
      lines: [
        {
          characterId: 'astronaut',
          text: 'Hello space.',
          emotion: 'happy',
        },
        {
          characterId: 'ai',
          text: 'Acknowledged.',
        },
      ],
    });
    expect(validErrors).toEqual([]);

    // Invalid characterId (e.g. pilot or alien)
    const invalidCharErrors = validateDialogueDefinition({
      id: 'invalid-char-dialogue',
      lines: [
        {
          characterId: 'pilot' as unknown as import('./dialogueTypes').CharacterId,
          text: 'Testing',
        },
      ],
    });
    expect(invalidCharErrors.some(e => e.includes('invalid characterId'))).toBe(true);
    expect(invalidCharErrors.some(e => e.includes('Only "astronaut" and "ai" are supported'))).toBe(true);

    // Invalid emotion
    const invalidEmotionErrors = validateDialogueDefinition({
      id: 'invalid-emotion-dialogue',
      lines: [
        {
          characterId: 'astronaut',
          text: 'Testing',
          emotion: 'unsupported-emotion' as unknown as import('../characters/characterTypes').EmotionId,
        },
      ],
    });
    expect(invalidEmotionErrors.some(e => e.includes('unsupported emotion'))).toBe(true);
  });

  it('resolves dialogue text variables dynamically', () => {
    expect(resolveDialogueText('Press {useToolKey} to place a wall.', { useToolKey: 'E' })).toBe('Press E to place a wall.');
    expect(resolveDialogueText('{astronautName}: scanning with {aiName}.')).toBe('Atom: scanning with Artimus.');
    // Supports custom variable override
    expect(resolveDialogueText('{astronautName}: Press {useToolKey}, {aiName}.', {
      astronautName: 'Major Tom',
      aiName: 'HAL',
      useToolKey: 'F',
    })).toBe('Major Tom: Press F, HAL.');
    // Preserves non-variable braces
    expect(resolveDialogueText('No variables here.')).toBe('No variables here.');
  });
});
