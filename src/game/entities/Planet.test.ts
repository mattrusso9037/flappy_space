import { describe, expect, it, vi } from 'vitest';
import { Planet } from './Planet';
import { Astronaut } from './Astronaut';
import { Texture } from 'pixi.js';

describe('planet presentation', () => {
  it('does not rebuild geometry or add children during flight', () => {
    const planet = new Planet(300, 200, 40, 2);
    const draw = vi.spyOn(planet, 'drawPlanet');
    for (let i = 0; i < 120; i++) planet.update(1 / 60);
    expect(draw).not.toHaveBeenCalled();
    expect(planet.graphics.children).toHaveLength(0);
    expect(planet.x).toBeCloseTo(60);
    planet.graphics.destroy(); planet.glowGraphics.destroy();
  });
  it('keeps decorative rings outside the collision envelope', () => {
    const planet = new Planet(300, 200, 40, 0);
    const pilot = new Astronaut(Texture.EMPTY, 358, 200);
    expect(planet.checkCollision(pilot)).toBe(false);
    pilot.sprite.x = 300;
    expect(planet.checkCollision(pilot)).toBe(true);
    planet.graphics.destroy(); planet.glowGraphics.destroy(); pilot.sprite.destroy();
  });
});
