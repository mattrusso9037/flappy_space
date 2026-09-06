import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDialogue,
  getDialogue,
  hasDialogue,
  getAllDialogues,
  clearDialogueRegistry,
  validateDialogueDefinition,
  UNKNOWN_SIGNAL_DIALOGUE,
} from './dialogues';

describe('Dialogue Registry', () => {
  beforeEach(() => {
    clearDialogueRegistry();
  });

  it('provides default registered dialogues', () => {
    expect(hasDialogue('unknown-signal')).toBe(true);
    expect(hasDialogue('lunar-arrival')).toBe(true);
    const dialogue = getDialogue('unknown-signal');
    expect(dialogue).toBeDefined();
    expect(dialogue?.lines.length).toBe(3);
    expect(dialogue?.lines[0].speaker).toBe('Mission Control');
  });

  it('allows registering custom dialogue definitions', () => {
    registerDialogue({
      id: 'custom-briefing',
      lines: [
        { speaker: 'Commander', text: 'Prepare for deep space jump.' },
      ],
    });

    expect(hasDialogue('custom-briefing')).toBe(true);
    const custom = getDialogue('custom-briefing');
    expect(custom?.lines[0].text).toBe('Prepare for deep space jump.');
  });

  it('returns all registered dialogues', () => {
    const all = getAllDialogues();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.map(d => d.id)).toContain('unknown-signal');
  });

  it('validates dialogue definitions correctly', () => {
    const validErrors = validateDialogueDefinition(UNKNOWN_SIGNAL_DIALOGUE);
    expect(validErrors).toEqual([]);

    const invalidErrors = validateDialogueDefinition({
      id: '',
      lines: [],
    });
    expect(invalidErrors.length).toBeGreaterThan(0);
    expect(invalidErrors[0]).toContain('non-empty string id');
  });

  it('detects invalid lines in dialogue definitions', () => {
    const errors = validateDialogueDefinition({
      id: 'bad-dialogue',
      lines: [
        { speaker: '', text: '' },
      ],
    });
    expect(errors.some(e => e.includes('missing valid speaker'))).toBe(true);
    expect(errors.some(e => e.includes('missing valid text'))).toBe(true);
  });
});
