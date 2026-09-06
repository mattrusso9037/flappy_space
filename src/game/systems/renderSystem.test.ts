import { describe, expect, it } from 'vitest';
import { Application, Container } from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { RenderSystem } from './renderSystem';
import { GameStateService } from '../gameStateService';

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
});
