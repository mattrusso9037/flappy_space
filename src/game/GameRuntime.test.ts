import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { createFlappySpaceRuntime } from './createFlappySpaceRuntime';
import { GameRuntime } from './GameRuntime';
import { GameEvent } from './eventBus';
import { JUMP_VELOCITY } from './config';


describe('GameRuntime & createFlappySpaceRuntime', () => {
  let app: PIXI.Application;

  beforeEach(() => {
    app = new PIXI.Application();
    // Simulate stage and ticker
    app.stage = new PIXI.Container();
    app.ticker = new PIXI.Ticker();
  });

  it('creates a GameRuntime instance with all required systems', () => {
    const runtime = createFlappySpaceRuntime(app);
    expect(runtime).toBeInstanceOf(GameRuntime);
    expect(runtime.app).toBe(app);
    expect(runtime.events).toBeDefined();
    expect(runtime.state).toBeDefined();
    expect(runtime.systems.entities).toBeDefined();
    expect(runtime.systems.physics).toBeDefined();
    expect(runtime.systems.spawning).toBeDefined();
    expect(runtime.systems.rendering).toBeDefined();
    expect(runtime.systems.input).toBeDefined();
    expect(runtime.systems.audio).toBeDefined();
    expect(runtime.systems.ui).toBeDefined();
  });

  it('initializes all systems and registers ticker listener', () => {
    const runtime = createFlappySpaceRuntime(app);
    const tickerAddSpy = vi.spyOn(app.ticker, 'add');

    runtime.initialize();

    expect(tickerAddSpy).toHaveBeenCalled();
    runtime.dispose();
  });

  it('starts the game and emits HIDE_START_PROMPT', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    let hidePromptEmitted = false;
    runtime.events.on(GameEvent.HIDE_START_PROMPT).subscribe(() => {
      hidePromptEmitted = true;
    });

    runtime.start();

    expect(runtime.state.getState().isStarted).toBe(true);
    expect(hidePromptEmitted).toBe(true);
    runtime.dispose();
  });

  it('pauses and resumes without throwing', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.start();

    runtime.pause();
    runtime.resume();

    expect(runtime.state.getState().isStarted).toBe(true);
    runtime.dispose();
  });

  it('resets session and emits SHOW_START_PROMPT', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    let showPromptEmitted = false;
    runtime.events.on(GameEvent.SHOW_START_PROMPT).subscribe(() => {
      showPromptEmitted = true;
    });

    runtime.reset();

    expect(showPromptEmitted).toBe(true);
    expect(runtime.state.getState().score).toBe(0);
    runtime.dispose();
  });

  it('disposes cleanly and removes ticker listener', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    const tickerRemoveSpy = vi.spyOn(app.ticker, 'remove');
    runtime.dispose();

    expect(tickerRemoveSpy).toHaveBeenCalled();
  });

  it('wires entities into input system so jump action flaps runtime astronaut', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    const astronaut = runtime.systems.entities.getAstronaut();
    expect(astronaut).toBeDefined();
    expect(astronaut!.velocity).toBe(0);

    // Simulate jump key (Space)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    // Velocity should have updated to flap jump velocity (JUMP_VELOCITY)
    expect(astronaut!.velocity).toBe(JUMP_VELOCITY);
    runtime.dispose();

  });

  it('wires entities into input system so directional movement updates astronaut velocity', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    const astronaut = runtime.systems.entities.getAstronaut();
    expect(astronaut).toBeDefined();

    // Simulate move right (KeyD)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));

    expect(astronaut!.horizontalVelocity).toBe(5);

    // Simulate move left (KeyA)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));

    expect(astronaut!.horizontalVelocity).toBe(-5);

    runtime.dispose();
  });
});

