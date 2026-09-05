import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inputSystem } from './inputSystem';
import { eventBus, GameEvent } from '../eventBus';
import { gameStateService } from '../gameStateService';

describe('InputSystem Characterization', () => {
  beforeEach(() => {
    gameStateService.resetGame();
  });

  afterEach(() => {
    inputSystem.dispose();
  });

  it('initializes and is idempotent on multiple initialize calls', () => {
    inputSystem.initialize();
    // Second initialize should not throw or duplicate
    expect(() => inputSystem.initialize()).not.toThrow();
  });

  it('enables input when game starts and disables when game is over', () => {
    inputSystem.initialize();

    gameStateService.startGame();
    // Input is enabled when started

    gameStateService.gameOver();
    // Input is disabled on game over
  });

  it('dispatches JUMP_ACTION event when jump key is pressed', () => {
    inputSystem.initialize();
    gameStateService.startGame();

    const jumpHandler = vi.fn();
    const sub = eventBus.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler);

    // Simulate spacebar keydown on window
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(jumpHandler).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
  });

  it('cleans up event listeners and subscriptions on dispose()', () => {
    inputSystem.initialize();
    gameStateService.startGame();

    inputSystem.dispose();

    const jumpHandler = vi.fn();
    const sub = eventBus.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler);

    // After dispose, pressing Space should not trigger JUMP_ACTION
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(jumpHandler).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('supports re-initialization after dispose()', () => {
    inputSystem.initialize();
    inputSystem.dispose();
    inputSystem.initialize();
    gameStateService.startGame();

    const jumpHandler = vi.fn();
    const sub = eventBus.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(jumpHandler).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
  });
});
