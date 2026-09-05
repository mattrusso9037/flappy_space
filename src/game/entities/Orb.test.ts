import { describe, it, expect, beforeEach } from 'vitest';
import { Orb } from './Orb';
import { Astronaut } from './Astronaut';
import * as PIXI from 'pixi.js';

describe('Orb Entity', () => {
  let orb: Orb;
  let astronaut: Astronaut;

  beforeEach(() => {
    orb = new Orb(300, 200, 20, 2);
    astronaut = new Astronaut(PIXI.Texture.EMPTY, 300, 200);
  });

  it('initializes with correct properties and graphics', () => {
    expect(orb.x).toBe(300);
    expect(orb.y).toBe(200);
    expect(orb.radius).toBe(20);
    expect(orb.speed).toBe(2);
    expect(orb.collected).toBe(false);
    expect(orb.graphics.x).toBe(300);
    expect(orb.graphics.y).toBe(200);
  });

  it('moves leftward on update', () => {
    orb.update(1 / 60);
    // At speed 2 and 60fps normalization: moveDistance = 2 * (1/60) * 60 = 2
    expect(orb.x).toBeCloseTo(298, 2);
    expect(orb.graphics.x).toBeCloseTo(298, 2);
  });

  it('detects collision with astronaut overlapping its position', () => {
    expect(orb.checkCollision(astronaut)).toBe(true);
  });

  it('returns false for collision when astronaut is far away', () => {
    const distantAstronaut = new Astronaut(PIXI.Texture.EMPTY, 50, 50);
    expect(orb.checkCollision(distantAstronaut)).toBe(false);
  });

  it('returns false for collision when astronaut is dead', () => {
    astronaut.die();
    expect(orb.checkCollision(astronaut)).toBe(false);
  });

  it('collects the orb and hides graphics', () => {
    orb.collect();
    expect(orb.collected).toBe(true);
    expect(orb.graphics.visible).toBe(false);
    expect(orb.glowGraphics.visible).toBe(false);
  });

  it('detects off-screen status accurately', () => {
    expect(orb.isOffScreen()).toBe(false);

    orb.x = -50;
    expect(orb.isOffScreen()).toBe(true);
  });
});
