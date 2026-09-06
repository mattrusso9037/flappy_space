import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { GameDisplayProps } from './components/GameDisplay';
import App from './App';

vi.mock('./components/GameDisplay', () => ({
  default: ({ campaign, storageKey }: GameDisplayProps) => (
    <div data-testid="game" data-campaign={campaign?.id ?? 'default'} data-storage={storageKey ?? 'default'} />
  ),
}));

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

describe('shareable relay demo entry', () => {
  it('opens the standalone campaign and its separate save with visible keyboard instructions', () => {
    window.history.replaceState({}, '', '/?demo=relay-vault');
    render(<App />);
    expect(screen.getByTestId('game').getAttribute('data-campaign')).toBe('flappy-spaceman-relay-demo');
    expect(screen.getByTestId('game').getAttribute('data-storage')).toBe('flappy_space_relay_demo_progress');
    expect(screen.getByText(/Recover all 8 energy orbs/)).toBeTruthy();
    expect(screen.getByText(/Keyboard demo/)).toBeTruthy();
  });
  it('keeps the default campaign and save for ordinary or unknown demo URLs', () => {
    window.history.replaceState({}, '', '/?demo=unknown');
    render(<App />);
    expect(screen.getByTestId('game').getAttribute('data-campaign')).toBe('default');
    expect(screen.getByTestId('game').getAttribute('data-storage')).toBe('default');
  });
});
