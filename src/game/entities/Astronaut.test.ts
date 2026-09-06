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

  it('keeps thrust immediate and restores presentation on reset', () => {
    const texture = astronaut.sprite.texture;
    const hitbox = astronaut.getHitbox();
    astronaut.flap();
    expect(astronaut.thrustRemaining).toBeGreaterThan(0);
    astronaut.updatePresentation(0.3);
    expect(astronaut.thrustRemaining).toBe(0);
    expect(astronaut.getHitbox()).toEqual(hitbox);
    astronaut.die(); astronaut.updatePresentation(0.3);
    expect(astronaut.sprite.rotation).not.toBe(0);
    astronaut.reset(200, 300);
    expect(astronaut.sprite.rotation).toBe(0);
    expect(astronaut.sprite.alpha).toBe(1);
    expect(astronaut.sprite.texture).toBe(texture);
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

  it('instantiates with AnimatedSprite stopped on frame 0 when frame array is provided', () => {
    const frames = [new PIXI.Texture(), new PIXI.Texture()];
    const animatedAstronaut = new Astronaut(frames, 100, 200);

    expect(animatedAstronaut.sprite).toBeInstanceOf(PIXI.AnimatedSprite);
    const anim = animatedAstronaut.sprite as PIXI.AnimatedSprite;
    expect(anim.playing).toBe(false);
    expect(anim.currentFrame).toBe(0);
    expect(animatedAstronaut.collisionDimensions).toEqual({ width: 35, height: 35 });
  });

  it('triggers animation on flap() and returns to resting frame 0 on completion', () => {
    const frames = [new PIXI.Texture(), new PIXI.Texture()];
    const animatedAstronaut = new Astronaut(frames, 100, 200);
    const anim = animatedAstronaut.sprite as PIXI.AnimatedSprite;

    expect(anim.playing).toBe(false);
    animatedAstronaut.flap();
    expect(anim.playing).toBe(true);

    // Call onComplete
    anim.onComplete?.();
    expect(anim.playing).toBe(false);
    expect(anim.currentFrame).toBe(0);
  });

  it('triggers animation on moveUp()', () => {
    const frames = [new PIXI.Texture(), new PIXI.Texture()];
    const animatedAstronaut = new Astronaut(frames, 100, 200);
    const anim = animatedAstronaut.sprite as PIXI.AnimatedSprite;

    expect(anim.playing).toBe(false);
    animatedAstronaut.moveUp();
    expect(anim.playing).toBe(true);
  });

  it('maintains fixed collision dimensions regardless of visual dimensions or frame changes', () => {
    const frames = [new PIXI.Texture(), new PIXI.Texture()];
    const animatedAstronaut = new Astronaut(frames, 200, 300);

    const initialHitbox = animatedAstronaut.getHitbox();
    expect(initialHitbox.maxX - initialHitbox.minX).toBe(35);
    expect(initialHitbox.maxY - initialHitbox.minY).toBe(35);

    // Change display dimensions
    animatedAstronaut.sprite.width = 120;
    animatedAstronaut.sprite.height = 200;

    const afterResizeHitbox = animatedAstronaut.getHitbox();
    expect(afterResizeHitbox.maxX - afterResizeHitbox.minX).toBe(35);
    expect(afterResizeHitbox.maxY - afterResizeHitbox.minY).toBe(35);
    expect((afterResizeHitbox.minX + afterResizeHitbox.maxX) / 2).toBe(200);
    expect((afterResizeHitbox.minY + afterResizeHitbox.maxY) / 2).toBe(300);
  });

  it('stops animation on die() and stops on frame 0 on reset()', () => {
    const frames = [new PIXI.Texture(), new PIXI.Texture()];
    const animatedAstronaut = new Astronaut(frames, 100, 200);
    const anim = animatedAstronaut.sprite as PIXI.AnimatedSprite;

    animatedAstronaut.flap();
    expect(anim.playing).toBe(true);
    animatedAstronaut.die();
    expect(anim.playing).toBe(false);

    animatedAstronaut.reset(150, 250);
    expect(anim.playing).toBe(false);
    expect(anim.currentFrame).toBe(0);
    expect(animatedAstronaut.dead).toBe(false);
  });

  it('switches animation frames and fps via playAnimation()', () => {
    const frames1 = [new PIXI.Texture(), new PIXI.Texture()];
    const frames2 = [new PIXI.Texture(), new PIXI.Texture(), new PIXI.Texture()];
    const animatedAstronaut = new Astronaut(frames1, 100, 200);
    const anim = animatedAstronaut.sprite as PIXI.AnimatedSprite;

    animatedAstronaut.playAnimation(frames2, 14, false);
    expect(anim.textures).toBe(frames2);
    expect(anim.animationSpeed).toBeCloseTo(14 / 60, 4);
    expect(anim.loop).toBe(false);
  });
});
