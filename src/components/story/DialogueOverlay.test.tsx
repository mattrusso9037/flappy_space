import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogueOverlay } from './DialogueOverlay';
import { DialogueDefinition } from '../../game/story/dialogue/dialogueTypes';

const testDialogue: DialogueDefinition = {
  id: 'test-dialogue',
  lines: [
    { speaker: 'Spaceman', text: 'Line 1 text', portraitId: 'pilot' },
    { speaker: 'Control', text: 'Line 2 text' },
  ],
};

describe('DialogueOverlay', () => {
  it('renders the initial dialogue line and speaker accurately', () => {
    const onComplete = vi.fn();
    render(
      <DialogueOverlay
        dialogueId="test-dialogue"
        customDefinition={testDialogue}
        onComplete={onComplete}
      />
    );

    expect(screen.getByTestId('dialogue-speaker').textContent).toBe('Spaceman');
    expect(screen.getByTestId('dialogue-text').textContent).toBe('Line 1 text');
    expect(screen.getByTestId('dialogue-counter').textContent).toBe('1 / 2');
    expect(screen.getByTestId('dialogue-portrait').textContent).toBe('pilot');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('advances to next line on click/advance', () => {
    const onComplete = vi.fn();
    render(
      <DialogueOverlay
        dialogueId="test-dialogue"
        customDefinition={testDialogue}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByTestId('dialogue-overlay'));

    expect(screen.getByTestId('dialogue-speaker').textContent).toBe('Control');
    expect(screen.getByTestId('dialogue-text').textContent).toBe('Line 2 text');
    expect(screen.getByTestId('dialogue-counter').textContent).toBe('2 / 2');
    expect(screen.queryByTestId('dialogue-portrait')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    // Advancing on final line triggers completion
    fireEvent.click(screen.getByTestId('dialogue-overlay'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('advances on Space and Enter keyboard events', () => {
    const onComplete = vi.fn();
    render(
      <DialogueOverlay
        dialogueId="test-dialogue"
        customDefinition={testDialogue}
        onComplete={onComplete}
      />
    );

    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByTestId('dialogue-text').textContent).toBe('Line 2 text');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips directly to completion on Skip button click', () => {
    const onComplete = vi.fn();
    render(
      <DialogueOverlay
        dialogueId="test-dialogue"
        customDefinition={testDialogue}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByTestId('dialogue-skip-btn'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips on Escape key press', () => {
    const onComplete = vi.fn();
    render(
      <DialogueOverlay
        dialogueId="test-dialogue"
        customDefinition={testDialogue}
        onComplete={onComplete}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete immediately when dialogue is not found', () => {
    const onComplete = vi.fn();
    render(
      <DialogueOverlay
        dialogueId="non-existent-dialogue"
        onComplete={onComplete}
      />
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
