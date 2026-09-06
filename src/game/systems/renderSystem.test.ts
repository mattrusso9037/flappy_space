import { describe, expect, it } from 'vitest';
import { Application, Container } from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { RenderSystem } from './renderSystem';
import { GameStateService } from '../gameStateService';
import { DEEP_NEBULA, VIOLET_REACH, SOLAR_STORM } from '../environments/environments';

describe('render presentation lifecycle', () => {
  it('resets warp and disposes atmosphere without touching other stage children', () => {
    const app = new Application(); app.stage = new Container();
    const unrelated = new Container(); app.stage.addChild(unrelated);
    const entities = new EntitySystem(app); entities.initialize();
    const render = new RenderSystem(app, entities, new GameStateService());
    render.initialize(); render.createBackground();
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
    expect(app.stage.children).toEqual([unrelated]);
  });

  it('initializes with default deep-nebula environment and applies environment presets cleanly', () => {
    const app = new Application(); app.stage = new Container();
    const unrelated = new Container(); app.stage.addChild(unrelated);
    const entities = new EntitySystem(app); entities.initialize();
    const render = new RenderSystem(app, entities, new GameStateService());

    render.initialize();
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
