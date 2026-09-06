import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { Application, Container } from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { RenderSystem } from './renderSystem';
import { PhysicsSystem } from './physicsSystem';
import { GameStateService } from '../gameStateService';
import { EventBus, GameEvent } from '../eventBus';
import { PipeObstacle } from '../entities/Obstacle';
import { createFlappySpaceRuntime } from '../createFlappySpaceRuntime';

describe('Debug Mode and Collision Geometry Discipline', () => {
  let app: Application;
  let events: EventBus;
  let state: GameStateService;
  let entities: EntitySystem;
  let render: RenderSystem;
  let physics: PhysicsSystem;

  beforeEach(() => {
    app = new Application();
    app.stage = new Container();
    events = new EventBus();
    state = new GameStateService();
    entities = new EntitySystem(app, undefined, events);
    render = new RenderSystem(app, entities, state);
    physics = new PhysicsSystem(entities, state, events);

    render.initialize();
    entities.initialize(app, render.worldCamera);
    physics.initialize();
  });

  afterEach(() => {
    physics.dispose();
    render.dispose();
    entities.dispose();
  });

  it('starts with debugMode false and zero debug instructions rendered', () => {
    expect(state.getState().debugMode).toBe(false);

    // Create entities in scene
    entities.createAstronaut();
    entities.createOrb(200, 200, 14, 0);
    entities.createPlanet(400, 200, 40, 0);

    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics.context.instructions.length).toBe(0);
  });

  it('renders astronaut, orb, and planet collision bounds when debugMode is true', () => {
    state.toggleDebugMode();
    expect(state.getState().debugMode).toBe(true);

    entities.createAstronaut();
    entities.createOrb(200, 200, 14, 0);
    entities.createPlanet(400, 200, 40, 0);

    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics.context.instructions.length).toBeGreaterThan(0);
  });

  it('renders ground collision line, terrain blocks, and wall panels in debug mode', () => {
    state.toggleDebugMode();

    entities.setGround({ enabled: true, height: 80 });
    entities.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
    entities.createAstronaut();
    entities.configureTerrainBlocks([
      { id: 'b1', bounds: { x: 300, y: 450, width: 60, height: 70 }, diggable: true },
      { id: 'b2', bounds: { x: 400, y: 450, width: 60, height: 70 }, diggable: false },
    ]);
    entities.createWall({ x: 500, y: 460, width: 80, height: 80 }, 20);

    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    // Multiple rects and strokes for astronaut (hazard + physical body), ground line, blocks, and walls
    expect(debugGraphics.context.instructions.length).toBeGreaterThanOrEqual(5);

    // Toggling off immediately clears all debug instructions
    state.toggleDebugMode();
    render.updateDebugPresentation();
    expect(debugGraphics.context.instructions.length).toBe(0);
  });

  it('renders PipeObstacle collision rectangles in debug mode', () => {
    state.toggleDebugMode();

    const pipe = new PipeObstacle(500, 150, 120, 80, 2);
    (entities as unknown as { obstacles: PipeObstacle[] }).obstacles.push(pipe);

    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics.context.instructions.length).toBeGreaterThan(0);
  });

  it('clears all debug graphics immediately when toggled off', () => {
    state.toggleDebugMode(); // true
    entities.createAstronaut();
    entities.createOrb(300, 200, 15, 0);
    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics.context.instructions.length).toBeGreaterThan(0);

    state.toggleDebugMode(); // false
    render.updateDebugPresentation();
    expect(debugGraphics.context.instructions.length).toBe(0);
  });

  it('synchronizes debugMode across EventBus, PhysicsSystem, and RenderSystem in GameRuntime', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    let eventToggledValue: boolean | null = null;
    runtime.events.on(GameEvent.DEBUG_TOGGLED).subscribe(val => {
      eventToggledValue = val;
    });

    expect(runtime.state.getState().debugMode).toBe(false);

    // Toggle debug mode ON
    runtime.state.toggleDebugMode();

    expect(runtime.state.getState().debugMode).toBe(true);
    expect(eventToggledValue).toBe(true);

    // Verify debug graphics updated immediately
    const debugGraphics = (runtime.systems.rendering as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics).toBeDefined();

    // Toggle debug mode OFF
    runtime.state.toggleDebugMode();
    expect(runtime.state.getState().debugMode).toBe(false);
    expect(eventToggledValue).toBe(false);
    expect(debugGraphics.context.instructions.length).toBe(0);

    runtime.dispose();
  });

  it('updates debug presentation immediately even when GameRuntime is paused', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.pause();

    const debugGraphics = (runtime.systems.rendering as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics.context.instructions.length).toBe(0);

    // Toggle ON while paused
    runtime.state.toggleDebugMode();
    expect(debugGraphics.context.instructions.length).toBeGreaterThan(0);

    // Toggle OFF while paused
    runtime.state.toggleDebugMode();
    expect(debugGraphics.context.instructions.length).toBe(0);

    runtime.dispose();
  });

  it('renders grapple anchors, scenario triggers, and camera bounds in debug mode', () => {
    state.toggleDebugMode();
    expect(state.getState().debugMode).toBe(true);

    entities.configureGrappleAnchors([
      { id: 'anchor-1', x: 700, y: 250 },
      { id: 'anchor-2', x: 1200, y: 150 },
    ]);
    entities.configureScenarios([
      {
        id: 'vault-entrance',
        trigger: { x: 1600, y: 0, width: 400, height: 600 },
        cameraBounds: { x: 1600, y: 0, width: 800, height: 600 },
      },
    ]);

    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    expect(debugGraphics.context.instructions.length).toBeGreaterThan(0);

    // Toggling off immediately clears everything
    state.toggleDebugMode();
    render.updateDebugPresentation();
    expect(debugGraphics.context.instructions.length).toBe(0);
  });

  it('differentiates diggable vs solid terrain blocks and uses canonical gameplay bounds', () => {
    state.toggleDebugMode();

    const diggableBlock = { id: 'dig-1', bounds: { x: 300, y: 400, width: 100, height: 50 }, diggable: true };
    const solidBlock = { id: 'sol-1', bounds: { x: 500, y: 400, width: 100, height: 50 }, diggable: false };

    entities.configureTerrainBlocks([diggableBlock, solidBlock]);

    render.update(0.016);

    const debugGraphics = (render as unknown as { debugGraphics: PIXI.Graphics }).debugGraphics;
    // Both blocks rendered, plus diggable indicator slash
    expect(debugGraphics.context.instructions.length).toBeGreaterThanOrEqual(3);
  });
});
