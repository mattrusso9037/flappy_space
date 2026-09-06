import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DialogueAvatar } from './DialogueAvatar';

describe('DialogueAvatar', () => {
  it('renders astronaut headshot avatar with correct sprite background and coordinates', () => {
    const { rerender } = render(<DialogueAvatar characterId="astronaut" />);

    const portrait = screen.getByTestId('dialogue-portrait');
    expect(portrait.classList.contains('dialogue-portrait--astronaut')).toBe(true);

    const headshot = screen.getByTestId('dialogue-portrait-headshot');
    expect(headshot.style.backgroundImage).toContain('assets/astronaut/astronaut-headshots.png');
    // Default neutral is 40% 0%
    expect(headshot.style.backgroundPosition).toBe('40% 0%');
    expect(portrait.textContent).toBe('astronaut');

    // Rerender with emotion: puzzled (col 3, row 0 -> 60% 0%)
    rerender(<DialogueAvatar characterId="astronaut" portraitId="puzzled" />);
    expect(headshot.style.backgroundPosition).toBe('60% 0%');
    expect(portrait.textContent).toBe('puzzled');

    // Rerender with emotion: nervous (col 4, row 1 -> 80% 100%)
    rerender(<DialogueAvatar characterId="astronaut" portraitId="nervous" />);
    expect(headshot.style.backgroundPosition).toBe('80% 100%');
    expect(portrait.textContent).toBe('nervous');
  });

  it('renders AI holographic optic with waveform when characterId is ai', () => {
    render(<DialogueAvatar characterId="ai" />);

    const portrait = screen.getByTestId('dialogue-portrait');
    expect(portrait.classList.contains('dialogue-portrait--ai')).toBe(true);
    expect(portrait.querySelector('.dialogue-portrait-ai')).not.toBeNull();
    expect(portrait.querySelector('.ai-core-ring')).not.toBeNull();
    expect(portrait.querySelector('.ai-waveform-wrap')).not.toBeNull();
    expect(portrait.textContent).toBe('ai');
  });

  it('returns null when characterId is not provided', () => {
    const { container } = render(<DialogueAvatar />);
    expect(container.firstChild).toBeNull();
  });
});
