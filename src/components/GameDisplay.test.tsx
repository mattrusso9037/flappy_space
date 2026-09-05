import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React, { StrictMode } from 'react';
import * as PIXI from 'pixi.js';
import GameDisplay from './GameDisplay';
import assetManager from '../game/assetManager';
import { GameState } from '../game/gameStateService';

describe('GameDisplay Component', () => {
  let originalInit: typeof PIXI.Application.prototype.init;

  beforeEach(() => {
    // Ensure asset manager reports loaded so runtime initializes promptly
    vi.spyOn(assetManager, 'isLoaded').mockReturnValue(true);
    vi.spyOn(assetManager, 'loadAssets').mockResolvedValue();

    // Mock PIXI Application init for headless testing environment
    originalInit = PIXI.Application.prototype.init;
    PIXI.Application.prototype.init = vi.fn().mockImplementation(async function (this: PIXI.Application) {
      this.stage = new PIXI.Container();
      this.ticker = new PIXI.Ticker();
      // Provide a dummy canvas element
      const dummyCanvas = document.createElement('canvas');
      Object.defineProperty(this, 'canvas', {
        get: () => dummyCanvas,
        configurable: true,
      });
      let rendererMock: unknown = {
        resize: vi.fn(),
        destroy: vi.fn(),
      };
      Object.defineProperty(this, 'renderer', {
        get: () => rendererMock,
        set: (val) => { rendererMock = val; },
        configurable: true,
      });
      this.destroy = vi.fn().mockImplementation(() => {
        rendererMock = null;
      });


    });
  });

  afterEach(() => {
    PIXI.Application.prototype.init = originalInit;
    vi.restoreAllMocks();
  });

  it('removes start overlay when starting the game in StrictMode', async () => {
    const handleGameStateChange = vi.fn();

    render(
      <StrictMode>
        <GameDisplay onGameStateChange={handleGameStateChange} />
      </StrictMode>
    );

    // Verify initial start overlay is rendered
    await waitFor(() => {
      expect(screen.getByText('Flappy Spaceman')).toBeInTheDocument();
      expect(screen.getByText('Press SPACE to start')).toBeInTheDocument();
    });

    // Click the start overlay to start the game
    const startOverlay = screen.getByText('Flappy Spaceman').closest('.start-overlay')!;
    expect(startOverlay).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(startOverlay);
    });

    // After clicking start, the start overlay must be removed from the DOM
    await waitFor(() => {
      expect(screen.queryByText('Press SPACE to start')).not.toBeInTheDocument();
      expect(screen.queryByText('Flappy Spaceman')).not.toBeInTheDocument();
    });

    // onGameStateChange must have been notified with isStarted: true
    expect(handleGameStateChange).toHaveBeenCalledWith(
      expect.objectContaining<Partial<GameState>>({ isStarted: true })
    );
  });

  it('removes start overlay when Space key is pressed in StrictMode', async () => {
    render(
      <StrictMode>
        <GameDisplay />
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByText('Press SPACE to start')).toBeInTheDocument();
    });

    // Press Space on document
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Press SPACE to start')).not.toBeInTheDocument();
    });
  });

  it('does not recreate runtime when onGameStateChange callback reference changes', async () => {
    const { rerender } = render(
      <StrictMode>
        <GameDisplay onGameStateChange={() => {}} />
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByText('Press SPACE to start')).toBeInTheDocument();
    });

    const initSpy = vi.mocked(PIXI.Application.prototype.init);
    const callCountAfterMount = initSpy.mock.calls.length;

    // Rerender with a newly allocated arrow function callback prop
    rerender(
      <StrictMode>
        <GameDisplay onGameStateChange={() => {}} />
      </StrictMode>
    );

    // PIXI init should NOT have been re-invoked simply because the callback changed
    expect(initSpy.mock.calls.length).toBe(callCountAfterMount);
  });
});
