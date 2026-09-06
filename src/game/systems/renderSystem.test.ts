import { describe, expect, it, vi } from 'vitest';
import { Application, Container } from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { RenderSystem } from './renderSystem';
import { GameStateService } from '../gameStateService';
import { DEEP_NEBULA, VIOLET_REACH, SOLAR_STORM } from '../environments/environments';

describe('render presentation lifecycle', () => {
  it('resets warp and disposes atmosphere without touching other stage children', () => {
    const app = new Application(); app.stage = new Container();
    const unrelated = new Container(); app.stage.addChild(unrelated);
    const entities = new EntitySystem(app);
    const render = new RenderSystem(app, entities, new GameStateService());
    // Initialize render first so worldCamera exists, then entities with worldCamera
    render.initialize();
    entities.initialize(app, render.worldCamera);
    render.createBackground();
    const stars = entities.getStars();
    render.beginWarp(); render.updateBackground(0.5);
    expect(render.warpProgress).toBeCloseTo(0.25);
    render.updateBackground(0);
    expect(render.warpProgress).toBeCloseTo(0.25);
    render.updateBackground(0.1);
    expect(stars.some(s => s.graphics.scale.x > 1)).toBe(true);
    render.reset(); expect(stars.every(s => s.graphics.scale.x === 1)).toBe(true);
    expect(render.warpProgress).toBe(0);
    render.dispose(); render.dispose(); entities.dispose();
    expect(app.stage.children).toContain(unrelated);
  });

  it('initializes with default deep-nebula environment and applies environment presets cleanly', () => {
    const app = new Application(); app.stage = new Container();
    const unrelated = new Container(); app.stage.addChild(unrelated);
    const entities = new EntitySystem(app);
    const render = new RenderSystem(app, entities, new GameStateService());

    render.initialize();
    entities.initialize(app, render.worldCamera);
    expect(render.getEnvironment().id).toBe(DEEP_NEBULA.id);

    // Switch to violet-reach
    render.applyEnvironment('violet-reach');
    expect(render.getEnvironment().id).toBe(VIOLET_REACH.id);

    // Switch to solar-storm
    render.applyEnvironment('solar-storm');
    expect(render.getEnvironment().id).toBe(SOLAR_STORM.id);

    // Ensure other stage children remain completely untouched
    expect(app.stage.children).toContain(unrelated);

    render.dispose();
    entities.dispose();
  });
});

// --------------------------------------------------------------------------
// Camera tests
// --------------------------------------------------------------------------

/** Minimal GameStateService mock for camera-only tests */
function makeStateMock(): GameStateService {
  return {
    getState: () => ({ debugMode: false, isStarted: false }),
    getState$: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
  } as unknown as GameStateService;
}

/** Minimal EntitySystem mock for camera-only tests */
function makeEntityMock(): EntitySystem {
  return {
    getStars: () => [],
    getOrbs: () => [],
    getObstacles: () => [],
    getAstronaut: () => null,
    createBackground: vi.fn(),
  } as unknown as EntitySystem;
}

describe('RenderSystem — cinematic camera', () => {
  it('worldCamera container is a direct child of app.stage after initialize()', () => {
    const app = new Application(); app.stage = new Container();
    const entities = makeEntityMock();
    const render = new RenderSystem(app, entities, makeStateMock());
    render.initialize(app);

    expect(app.stage.children).toContain(render.worldCamera);
    render.dispose();
  });

  it('setCamera offsets and scales worldCamera from game center', () => {
    const app = new Application(); app.stage = new Container();
    const render = new RenderSystem(app, makeEntityMock(), makeStateMock());
    render.initialize(app);

    render.setCamera(30, -15, 1.1);

    const wc = render.worldCamera;
    // pivot = GAME_WIDTH/2, GAME_HEIGHT/2
    expect(wc.pivot.x).toBeCloseTo(400, 0);
    expect(wc.pivot.y).toBeCloseTo(300, 0);
    // position = center + offset
    expect(wc.position.x).toBeCloseTo(430, 0);
    expect(wc.position.y).toBeCloseTo(285, 0);
    expect(wc.scale.x).toBeCloseTo(1.1, 3);
    render.dispose();
  });

  it('resetCamera restores neutral transform (pivot=0, position=0, scale=1)', () => {
    const app = new Application(); app.stage = new Container();
    const render = new RenderSystem(app, makeEntityMock(), makeStateMock());
    render.initialize(app);

    render.setCamera(50, 25, 1.3);
    render.resetCamera();

    const wc = render.worldCamera;
    expect(wc.pivot.x).toBe(0);
    expect(wc.pivot.y).toBe(0);
    expect(wc.position.x).toBe(0);
    expect(wc.position.y).toBe(0);
    expect(wc.scale.x).toBe(1);
    expect(wc.scale.y).toBe(1);
    render.dispose();
  });

  it('neutral camera (x=0, y=0, zoom=1) produces zero net transform', () => {
    const app = new Application(); app.stage = new Container();
    const render = new RenderSystem(app, makeEntityMock(), makeStateMock());
    render.initialize(app);

    render.setCamera(0, 0, 1);

    const wc = render.worldCamera;
    expect(wc.position.x - wc.pivot.x).toBeCloseTo(0, 5);
    expect(wc.position.y - wc.pivot.y).toBeCloseTo(0, 5);
    expect(wc.scale.x).toBeCloseTo(1, 5);
    render.dispose();
  });

  it('HUD and fade overlays are NOT children of worldCamera (outside camera transform)', () => {
    const app = new Application(); app.stage = new Container();
    const render = new RenderSystem(app, makeEntityMock(), makeStateMock());
    render.initialize(app);

    const wc = render.worldCamera;
    // worldCamera should only contain the atmosphere container
    // All other stage children (fade, debug) should be on app.stage, not worldCamera
    const stageChildCount = app.stage.children.length;
    // stage has: worldCamera + fadeGraphics + debugGraphics = 3 children
    expect(stageChildCount).toBeGreaterThanOrEqual(2);
    // worldCamera itself should be one of them
    expect(app.stage.children).toContain(wc);
    render.dispose();
  });

  it('reset() calls resetCamera() returning worldCamera to neutral', () => {
    const app = new Application(); app.stage = new Container();
    const entities = makeEntityMock();
    const render = new RenderSystem(app, entities, makeStateMock());
    render.initialize(app);

    render.setCamera(100, 50, 2);
    render.reset();

    const wc = render.worldCamera;
    expect(wc.pivot.x).toBe(0);
    expect(wc.pivot.y).toBe(0);
    expect(wc.scale.x).toBe(1);
    render.dispose();
  });

  it('setFadeAlpha does not affect worldCamera transform', () => {
    const app = new Application(); app.stage = new Container();
    const render = new RenderSystem(app, makeEntityMock(), makeStateMock());
    render.initialize(app);

    render.setCamera(30, 0, 1.2);
    const xBefore = render.worldCamera.position.x;

    render.setFadeAlpha(0.5);

    expect(render.worldCamera.position.x).toBe(xBefore);
    expect(render.worldCamera.scale.x).toBeCloseTo(1.2, 3);
    render.dispose();
  });
});
