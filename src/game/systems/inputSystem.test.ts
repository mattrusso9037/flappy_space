import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputSystem } from './inputSystem';
import { EventBus, GameEvent } from '../eventBus';
import { GameStateService } from '../gameStateService';
import { InputManager } from '../inputManager';
import { EntitySystem } from './entitySystem';

describe('InputSystem', () => {
  let events: EventBus;
  let state: GameStateService;
  let inputMgr: InputManager;
  let entities: EntitySystem;
  let inputSystem: InputSystem;

  beforeEach(() => {
    events = new EventBus();
    state = new GameStateService();
    inputMgr = new InputManager();
    entities = new EntitySystem(undefined, undefined, events);
    inputSystem = new InputSystem(events, state, inputMgr, entities);
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

    state.startGame();
    // Input is enabled when started

    state.gameOver();
    // Input is disabled on game over
  });

  it('dispatches JUMP_ACTION event when jump key is pressed', () => {
    inputSystem.initialize();
    state.startGame();

    const jumpHandler = vi.fn();
    const sub = events.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler);

    // Simulate spacebar keydown on window
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(jumpHandler).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
  });

  it('cleans up event listeners and subscriptions on dispose()', () => {
    inputSystem.initialize();
    state.startGame();

    inputSystem.dispose();

    const jumpHandler = vi.fn();
    const sub = events.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler);

    // After dispose, pressing Space should not trigger JUMP_ACTION
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(jumpHandler).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('isolates independent runtimes so input in one does not affect another', () => {
    const events2 = new EventBus();
    const state2 = new GameStateService();
    const inputMgr2 = new InputManager();
    const entities2 = new EntitySystem(undefined, undefined, events2);
    const inputSystem2 = new InputSystem(events2, state2, inputMgr2, entities2);

    inputSystem.initialize();
    inputSystem2.initialize();

    state.startGame();
    // state2 not started!

    const jumpHandler1 = vi.fn();
    const jumpHandler2 = vi.fn();

    const sub1 = events.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler1);
    const sub2 = events2.on(GameEvent.JUMP_ACTION).subscribe(jumpHandler2);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(jumpHandler1).toHaveBeenCalledTimes(1);
    expect(jumpHandler2).not.toHaveBeenCalled();

    sub1.unsubscribe();
    sub2.unsubscribe();
    inputSystem2.dispose();
  });

  it('never toggles debug mode when pressing D or Shift+D (avoids move right conflict)', () => {
    inputSystem.initialize();
    state.startGame();

    expect(state.getState().debugMode).toBe(false);

    // Pressing 'd' or 'D' to move right must NOT toggle debug mode
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD' }));
    expect(state.getState().debugMode).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', code: 'KeyD' }));
    expect(state.getState().debugMode).toBe(false);

    // Shift+D must NEVER toggle debug mode
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', code: 'KeyD', shiftKey: true }));
    expect(state.getState().debugMode).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', shiftKey: true }));
    expect(state.getState().debugMode).toBe(false);

    // Dedicated non-gameplay shortcuts (Backquote or F3) toggle debug mode
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'Backquote' }));
    expect(state.getState().debugMode).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3', code: 'F3' }));
    expect(state.getState().debugMode).toBe(false);
  });

  it('polls held directional controls during update() to drive continuous astronaut movement', () => {
    inputSystem.initialize();
    state.startGame();

    const mockAstro = {
      dead: false,
      moveRight: vi.fn(),
      moveLeft: vi.fn(),
    };
    vi.spyOn(entities, 'getAstronaut').mockReturnValue(mockAstro as unknown as ReturnType<typeof entities.getAstronaut>);

    // Simulate holding KeyD (keydown without keyup)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(inputSystem.getDirectionalInput().right).toBe(true);
    // Initial keydown triggers immediate moveRight response
    expect(mockAstro.moveRight).toHaveBeenCalledTimes(1);

    // Per-frame update drives continuous movement while held
    inputSystem.update(0.016);
    expect(mockAstro.moveRight).toHaveBeenCalledTimes(2);

    inputSystem.update(0.016);
    expect(mockAstro.moveRight).toHaveBeenCalledTimes(3);

    // Release KeyD
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    expect(inputSystem.getDirectionalInput().right).toBe(false);

    // After release, update no longer invokes moveRight
    inputSystem.update(0.016);
    expect(mockAstro.moveRight).toHaveBeenCalledTimes(3);

    // Simulate holding KeyA
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    expect(inputSystem.getDirectionalInput().left).toBe(true);
    expect(mockAstro.moveLeft).toHaveBeenCalledTimes(1);

    inputSystem.update(0.016);
    expect(mockAstro.moveLeft).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
  });
});
