import { describe, it, expect, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { Astronaut } from './Astronaut';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY, JUMP_VELOCITY, MAX_VELOCITY } from '../config';

describe('Astronaut Entity', () => {
  let astronaut: Astronaut;

  beforeEach(() => {
    astronaut = new Astronaut(PIXI.Texture.EMPTY, 200, 300);
  });

  it('initializes at the specified position with zero velocity', () => {
    expect(astronaut.sprite.x).toBe(200);
    expect(astronaut.sprite.y).toBe(300);
    expect(astronaut.velocity).toBe(0);
    expect(astronaut.horizontalVelocity).toBe(0);
    expect(astronaut.dead).toBe(false);
  });

  it('applies gravity on update', () => {
    astronaut.update(16.667);
    expect(astronaut.velocity).toBeCloseTo(GRAVITY, 4);
    expect(astronaut.sprite.y).toBeGreaterThan(300);
  });

  it('caps downward velocity at MAX_VELOCITY', () => {
    astronaut.velocity = MAX_VELOCITY - 0.01;
    astronaut.update(100);
    expect(astronaut.velocity).toBe(MAX_VELOCITY);
  });

  it('jumps (flaps) and changes velocity to JUMP_VELOCITY', () => {
    astronaut.flap();
    expect(astronaut.velocity).toBe(JUMP_VELOCITY);
  });

  it('responds to directional move actions', () => {
    astronaut.moveLeft();
    expect(astronaut.horizontalVelocity).toBe(-5);

    astronaut.moveRight();
    expect(astronaut.horizontalVelocity).toBe(5);

    astronaut.moveUp();
    expect(astronaut.velocity).toBe(-5);

    astronaut.moveDown();
    expect(astronaut.velocity).toBe(5);
  });

  it('clamps at the top boundary and zeroes vertical velocity', () => {
    astronaut.sprite.y = 10;
    astronaut.velocity = -10;
    astronaut.update(16.667);

    const halfHeight = astronaut.sprite.height / 2;
    expect(astronaut.sprite.y).toBe(halfHeight);
    expect(astronaut.velocity).toBe(0);
  });

  it('clamps at the bottom boundary and marks astronaut dead', () => {
    astronaut.sprite.y = GAME_HEIGHT - 10;
    astronaut.velocity = 10;
    astronaut.update(16.667);

    const halfHeight = astronaut.sprite.height / 2;
    expect(astronaut.sprite.y).toBe(GAME_HEIGHT - halfHeight);
    expect(astronaut.dead).toBe(true);
    expect(astronaut.sprite.tint).toBe(0xFF5555);
  });

  it('clamps at horizontal boundaries', () => {
    // Left boundary
    astronaut.sprite.x = 10;
    astronaut.horizontalVelocity = -10;
    astronaut.update(16.667);
    expect(astronaut.sprite.x).toBe(astronaut.sprite.width / 2);
    expect(astronaut.horizontalVelocity).toBe(0);

    // Right boundary
    astronaut.sprite.x = GAME_WIDTH - 10;
    astronaut.horizontalVelocity = 10;
    astronaut.update(16.667);
    expect(astronaut.sprite.x).toBe(GAME_WIDTH - astronaut.sprite.width / 2);
    expect(astronaut.horizontalVelocity).toBe(0);
  });

  it('calculates a scaled hitbox correctly (70% scale)', () => {
    astronaut.sprite.x = 100;
    astronaut.sprite.y = 200;
    const hitbox = astronaut.getHitbox();

    const expectedWidth = astronaut.sprite.width * 0.7;
    const expectedHeight = astronaut.sprite.height * 0.7;

    expect(hitbox.maxX - hitbox.minX).toBeCloseTo(expectedWidth, 3);
    expect(hitbox.maxY - hitbox.minY).toBeCloseTo(expectedHeight, 3);
    expect((hitbox.minX + hitbox.maxX) / 2).toBeCloseTo(100, 3);
    expect((hitbox.minY + hitbox.maxY) / 2).toBeCloseTo(200, 3);
  });

  it('resets state when reset() is called', () => {
    astronaut.die();
    astronaut.velocity = 12;
    astronaut.horizontalVelocity = 5;

    astronaut.reset(150, 250);

    expect(astronaut.sprite.x).toBe(150);
    expect(astronaut.sprite.y).toBe(250);
    expect(astronaut.velocity).toBe(0);
    expect(astronaut.horizontalVelocity).toBe(0);
    expect(astronaut.dead).toBe(false);
    expect(astronaut.sprite.tint).toBe(0xFFFFFF);
  });

  it('does not update movement or accept actions when dead', () => {
    astronaut.die();
    const startY = astronaut.sprite.y;

    astronaut.update(16.667);
    expect(astronaut.sprite.y).toBe(startY);

    astronaut.flap();
    expect(astronaut.velocity).toBe(0);

    astronaut.moveLeft();
    expect(astronaut.horizontalVelocity).toBe(0);
  });
});
