import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogueOverlay } from './DialogueOverlay';
import { DialogueDefinition } from '../../game/story/dialogue/dialogueTypes';

const testDialogue: DialogueDefinition = {
  id: 'test-dialogue',
  lines: [
    { characterId: 'astronaut', speaker: 'Atom', text: 'Line 1 text', portraitId: 'neutral' },
    { speaker: 'Artimus', text: 'Line 2 text' },
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

    expect(screen.getByTestId('dialogue-speaker').textContent).toBe('Atom');
    expect(screen.getByTestId('dialogue-text').textContent).toBe('Line 1 text');
    expect(screen.getByTestId('dialogue-counter').textContent).toBe('1 / 2');
    expect(screen.getByTestId('dialogue-portrait').textContent).toBe('neutral');
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

    expect(screen.getByTestId('dialogue-speaker').textContent).toBe('Artimus');
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

  it('interpolates dynamic key variables in dialogue text', () => {
    const variableDialogue: DialogueDefinition = {
      id: 'var-dialogue',
      lines: [
        { speaker: 'Flight AI', text: 'Build walls using the {useToolKey} key.' },
      ],
    };

    render(
      <DialogueOverlay
        dialogueId="var-dialogue"
        customDefinition={variableDialogue}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByTestId('dialogue-text').textContent).toBe('Build walls using the E key.');
  });

  it('allows overriding dialogue variables via props', () => {
    const variableDialogue: DialogueDefinition = {
      id: 'override-dialogue',
      lines: [
        { speaker: 'Flight AI', text: 'Activate module with {useToolKey}.' },
      ],
    };

    render(
      <DialogueOverlay
        dialogueId="override-dialogue"
        customDefinition={variableDialogue}
        variables={{ useToolKey: 'Q' }}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByTestId('dialogue-text').textContent).toBe('Activate module with Q.');
  });

  it('interpolates speaker name variables for astronaut and AI dynamically', () => {
    const conversationDialogue: DialogueDefinition = {
      id: 'convo-dialogue',
      lines: [
        { speaker: '{astronautName}', text: 'What is this, {aiName}?' },
      ],
    };

    // Default resolution
    const { unmount } = render(
      <DialogueOverlay
        dialogueId="convo-dialogue"
        customDefinition={conversationDialogue}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByTestId('dialogue-speaker').textContent).toBe('Atom');
    expect(screen.getByTestId('dialogue-text').textContent).toBe('What is this, Artimus?');

    unmount();

    // Custom variable override for names
    render(
      <DialogueOverlay
        dialogueId="convo-dialogue"
        customDefinition={conversationDialogue}
        variables={{ astronautName: 'Neil', aiName: 'Computer' }}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByTestId('dialogue-speaker').textContent).toBe('Neil');
    expect(screen.getByTestId('dialogue-text').textContent).toBe('What is this, Computer?');
  });

  it('renders astronaut headshot sprite avatar with correct background image and coordinates', () => {
    const astronautDialogue: DialogueDefinition = {
      id: 'avatar-dialogue',
      lines: [
        { characterId: 'astronaut', speaker: 'Atom', text: 'Default face' },
        { characterId: 'astronaut', speaker: 'Atom', text: 'Nervous face', portraitId: 'nervous' },
      ],
    };

    render(
      <DialogueOverlay
        dialogueId="avatar-dialogue"
        customDefinition={astronautDialogue}
        onComplete={vi.fn()}
      />
    );

    const portrait = screen.getByTestId('dialogue-portrait');
    expect(portrait.classList.contains('dialogue-portrait--astronaut')).toBe(true);

    const headshot = screen.getByTestId('dialogue-portrait-headshot');
    expect(headshot.style.backgroundImage).toContain('assets/astronaut/astronaut-headshots.png');
    // Default neutral is col 2, row 0 -> 40% 0%
    expect(headshot.style.backgroundPosition).toBe('40% 0%');

    // Advance to nervous face
    fireEvent.click(screen.getByTestId('dialogue-overlay'));
    const nervousHeadshot = screen.getByTestId('dialogue-portrait-headshot');
    // Nervous is col 4, row 1 -> 80% 100%
    expect(nervousHeadshot.style.backgroundPosition).toBe('80% 100%');
  });

  it('renders AI holographic portrait when characterId is ai', () => {
    const aiDialogue: DialogueDefinition = {
      id: 'ai-dialogue',
      lines: [
        { characterId: 'ai', speaker: 'Artimus', text: 'AI processing...' },
      ],
    };

    render(
      <DialogueOverlay
        dialogueId="ai-dialogue"
        customDefinition={aiDialogue}
        onComplete={vi.fn()}
      />
    );

    const portrait = screen.getByTestId('dialogue-portrait');
    expect(portrait.classList.contains('dialogue-portrait--ai')).toBe(true);
    expect(portrait.querySelector('.dialogue-portrait-ai')).not.toBeNull();
    expect(portrait.textContent).toBe('ai');
  });
});
