import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { Astronaut } from './Astronaut';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, ASTRONAUT } from '../config';
import { ASTRONAUT_SPRITE_DEFINITION } from '../visuals/spriteAnimations';
import { ResolvedSpritePresentation } from '../visuals/spriteAnimationTypes';

function createMockPresentation(includeStill = true): ResolvedSpritePresentation {
  const idleFrames = [new PIXI.Texture(), new PIXI.Texture()];
  const thrustFrames = [new PIXI.Texture(), new PIXI.Texture(), new PIXI.Texture()];
  const walkFrames = [new PIXI.Texture(), new PIXI.Texture()];
  const walkLeftFrames = [new PIXI.Texture(), new PIXI.Texture()];
  const stillFrames = [new PIXI.Texture(), new PIXI.Texture()];
  const animations: Record<string, import('../visuals/spriteAnimationTypes').ResolvedSpriteAnimation> = {
    idle: {
      name: 'idle',
      frames: idleFrames,
      fps: 3,
      loop: true,
    },
    thrust: {
      name: 'thrust',
      frames: thrustFrames,
      fps: 3,
      loop: false,
    },
    walk: {
      name: 'walk',
      frames: walkFrames,
      fps: 12,
      loop: true,
    },
    walk_left: {
      name: 'walk_left',
      frames: walkLeftFrames,
      fps: 12,
      loop: true,
    },
  };
  if (includeStill) {
    animations.still = {
      name: 'still',
      frames: stillFrames,
      fps: 12,
      loop: true,
    };
  }
  return {
    definition: ASTRONAUT_SPRITE_DEFINITION,
    animations,
    fallbackTexture: new PIXI.Texture(),
  };
}

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

  it('thrusts (jumps) and changes velocity to JUMP_VELOCITY', () => {
    astronaut.thrust();
    expect(astronaut.velocity).toBe(JUMP_VELOCITY);
  });

  it('supports flap() as an alias to thrust()', () => {
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

  it('clamps at the top boundary using logical body dimensions', () => {
    astronaut.sprite.y = 10;
    astronaut.velocity = -10;
    astronaut.update(16.667);

    const halfHeight = ASTRONAUT.body.height / 2;
    expect(astronaut.sprite.y).toBe(halfHeight);
    expect(astronaut.velocity).toBe(0);
  });

  it('clamps at the bottom boundary and marks astronaut dead', () => {
    astronaut.sprite.y = GAME_HEIGHT - 10;
    astronaut.velocity = 10;
    astronaut.update(16.667);

    const halfHeight = ASTRONAUT.body.height / 2;
    expect(astronaut.sprite.y).toBe(GAME_HEIGHT - halfHeight);
    expect(astronaut.dead).toBe(true);
    expect(astronaut.sprite.tint).toBe(0xFF5555);
  });

  it('clamps at horizontal boundaries using logical body dimensions', () => {
    const halfWidth = ASTRONAUT.body.width / 2;

    // Left boundary
    astronaut.sprite.x = 10;
    astronaut.horizontalVelocity = -10;
    astronaut.update(16.667);
    expect(astronaut.sprite.x).toBe(halfWidth);
    expect(astronaut.horizontalVelocity).toBe(0);

    // Right boundary
    astronaut.sprite.x = GAME_WIDTH - 10;
    astronaut.horizontalVelocity = 10;
    astronaut.update(16.667);
    expect(astronaut.sprite.x).toBe(GAME_WIDTH - halfWidth);
    expect(astronaut.horizontalVelocity).toBe(0);
  });

  it('verifies that visual frame dimensions do not change logical body bounds', () => {
    const presentation = createMockPresentation();
    const animatedAstro = new Astronaut(presentation, 10, 10);
    // Artificially change sprite scale / rendered dimensions
    animatedAstro.sprite.scale.set(5.0);

    animatedAstro.update(16.667);
    // Boundary clamp must still be at ASTRONAUT.body.width / 2 and ASTRONAUT.body.height / 2
    expect(animatedAstro.sprite.x).toBe(ASTRONAUT.body.width / 2);
    expect(animatedAstro.sprite.y).toBe(ASTRONAUT.body.height / 2);
  });

  it('calculates fixed 35x35 hitbox correctly', () => {
    astronaut.sprite.x = 100;
    astronaut.sprite.y = 200;
    const hitbox = astronaut.getHitbox();

    expect(hitbox.maxX - hitbox.minX).toBe(35);
    expect(hitbox.maxY - hitbox.minY).toBe(35);
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
    astronaut.thrust();
    expect(astronaut.thrustRemaining).toBeGreaterThan(0);
    astronaut.updatePresentation(0.3);
    expect(astronaut.thrustRemaining).toBe(0);
    expect(astronaut.getHitbox()).toEqual(hitbox);
    astronaut.die();
    astronaut.updatePresentation(0.3);
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

    astronaut.thrust();
    expect(astronaut.velocity).toBe(0);

    astronaut.moveLeft();
    expect(astronaut.horizontalVelocity).toBe(0);
  });

  it('works with static fallback when raw texture is provided', () => {
    const fallbackTex = new PIXI.Texture();
    const staticAstro = new Astronaut(fallbackTex, 100, 200);
    expect(staticAstro.sprite).toBeInstanceOf(PIXI.Sprite);
    expect(staticAstro.getCurrentAnimation()).toBe('none');
    expect(staticAstro.collisionDimensions).toEqual({ width: 35, height: 35 });
  });

  describe('Canonical ResolvedSpritePresentation integration', () => {
    it('advances only on simulation time and freezes on zero delta or death', () => {
      const astro = new Astronaut(createMockPresentation(), 100, 200);
      const sprite = astro.sprite as PIXI.AnimatedSprite;
      expect(sprite.autoUpdate).toBe(false);
      astro.updatePresentation(0.4);
      expect(sprite.currentFrame).toBe(1);
      astro.updatePresentation(0);
      expect(sprite.currentFrame).toBe(1);
      astro.die();
      astro.updatePresentation(0.4);
      expect(sprite.currentFrame).toBe(1);
      astro.sprite.destroy();
    });

    it('completes thrust from elapsed time without moving the body', () => {
      const astro = new Astronaut(createMockPresentation(), 100, 200);
      astro.thrust();
      astro.updatePresentation(1.1);
      expect(astro.getCurrentAnimation()).toBe('idle');
      expect(astro.sprite.position.x).toBe(100);
      expect(astro.sprite.position.y).toBe(200);
      astro.sprite.destroy();
    });

    it('initializes to canonical default animation (idle) with canonical FPS and loop flag', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      expect(astro.getCurrentAnimation()).toBe('idle');
      expect(anim.playing).toBe(true);
      expect(anim.loop).toBe(true);
      expect(anim.animationSpeed).toBeCloseTo(3 / 60, 4);
      expect(anim.textures).toBe(presentation.animations.idle.frames);
      expect(astro.collisionDimensions).toEqual({ width: 35, height: 35 });
    });

    it('thrust() and flap() switch to canonical thrust with canonical FPS and loop flag', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.thrust();
      expect(astro.getCurrentAnimation()).toBe('thrust');
      expect(anim.textures).toBe(presentation.animations.thrust.frames);
      expect(anim.loop).toBe(false);
      expect(anim.animationSpeed).toBeCloseTo(3 / 60, 4);
      expect(anim.playing).toBe(true);
    });

    it('repeated thrust/flap updates velocity without restarting already-running thrust animation', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.thrust();
      expect(astro.getCurrentAnimation()).toBe('thrust');

      // Advance frame
      anim.currentFrame = 1;
      const playAnimationSpy = vi.spyOn(astro, 'playAnimation');

      // Repeated thrust/flap while already playing thrust
      astro.velocity = 0; // reset velocity to test update
      astro.thrust();

      // Velocity must update
      expect(astro.velocity).toBe(JUMP_VELOCITY);
      // playAnimation must NOT have been called again (animation not restarted)
      expect(playAnimationSpy).not.toHaveBeenCalled();
      expect(anim.currentFrame).toBe(1);
    });

    it('thrust completion cleanly returns to canonical default animation (idle)', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.thrust();
      expect(astro.getCurrentAnimation()).toBe('thrust');

      // Complete thrust animation
      anim.onComplete?.();
      expect(astro.getCurrentAnimation()).toBe('idle');
      expect(anim.textures).toBe(presentation.animations.idle.frames);
      expect(anim.loop).toBe(true);
      expect(anim.playing).toBe(true);
    });

    it('moveUp triggers thrust presentation', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.moveUp();
      expect(astro.getCurrentAnimation()).toBe('thrust');
      expect(anim.textures).toBe(presentation.animations.thrust.frames);
      expect(anim.loop).toBe(false);
    });

    it('reset returns to idle', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.thrust();
      expect(astro.getCurrentAnimation()).toBe('thrust');

      astro.reset(150, 250);
      expect(astro.getCurrentAnimation()).toBe('idle');
      expect(anim.textures).toBe(presentation.animations.idle.frames);
      expect(anim.loop).toBe(true);
      expect(anim.playing).toBe(true);
    });

    it('missing animation key fails safely without crashing', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);

      expect(() => astro.playAnimation('non_existent_key')).not.toThrow();
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('animation changes do not alter (x, y) coordinates', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 120, 240);

      astro.playAnimation('thrust');
      expect(astro.sprite.x).toBe(120);
      expect(astro.sprite.y).toBe(240);

      astro.playAnimation('idle');
      expect(astro.sprite.x).toBe(120);
      expect(astro.sprite.y).toBe(240);
    });

    it('animation changes do not alter 35x35 hitbox', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);

      const idleHitbox = astro.getHitbox();
      astro.playAnimation('thrust');
      const thrustHitbox = astro.getHitbox();

      expect(idleHitbox.maxX - idleHitbox.minX).toBe(35);
      expect(idleHitbox.maxY - idleHitbox.minY).toBe(35);
      expect(thrustHitbox.maxX - thrustHitbox.minX).toBe(35);
      expect(thrustHitbox.maxY - thrustHitbox.minY).toBe(35);
    });

    it('stale thrust completion does not override death state', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.thrust();
      expect(astro.getCurrentAnimation()).toBe('thrust');

      // Astronaut dies while thrust was running
      astro.die();
      expect(astro.dead).toBe(true);

      // Stale callback fires
      anim.onComplete?.();
      expect(astro.dead).toBe(true);
      expect(anim.playing).toBe(false);
    });

    it('stale thrust completion does not override reset state', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 200);
      const anim = astro.sprite as PIXI.AnimatedSprite;

      astro.thrust();
      const staleCallback = anim.onComplete;

      // Reset is called before completion
      astro.reset(150, 250);
      expect(astro.getCurrentAnimation()).toBe('idle');

      // If stale callback is somehow invoked, it must not disrupt idle
      staleCallback?.();
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('lands on ground without dying when groundY is configured', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 495);
      const groundY = 520;
      const halfHeight = ASTRONAUT.body.height / 2;

      astro.setGroundY(groundY);
      astro.velocity = 10;
      astro.update(16.667);

      expect(astro.sprite.y).toBe(groundY - halfHeight);
      expect(astro.velocity).toBe(0);
      expect(astro.dead).toBe(false);
      expect(astro.isGrounded).toBe(true);
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('damps rotation toward 0 (upright) while grounded', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 495);
      const groundY = 520;

      astro.setGroundY(groundY);
      astro.rotation = 0.5; // Tilted from flight
      astro.update(16.667);

      expect(astro.isGrounded).toBe(true);
      // Rotation should decrease toward 0
      expect(astro.rotation).toBeLessThan(0.5);
    });

    it('launches off ground when thrust() is called, clearing isGrounded', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 495);
      astro.setGroundY(520);
      astro.update(16.667);
      expect(astro.isGrounded).toBe(true);

      astro.thrust();
      expect(astro.velocity).toBe(JUMP_VELOCITY);
      expect(astro.isGrounded).toBe(false);
      expect(astro.getCurrentAnimation()).toBe('thrust');
    });

    it('returns to idle when thrust animation completes if landed on ground', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 495);
      const anim = astro.sprite as PIXI.AnimatedSprite;
      astro.setGroundY(520);
      astro.update(16.667);
      expect(astro.isGrounded).toBe(true);

      astro.thrust();
      expect(astro.getCurrentAnimation()).toBe('thrust');

      // Land back on ground
      astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
      astro.isGrounded = true;

      // Thrust completes
      anim.onComplete?.();
      expect(astro.getCurrentAnimation()).toBe('idle');
    });
  });

  describe('Movement mode & thrust capacity capabilities', () => {
    it('defaults to flight mode with unlimited thrust charges and active moveUp/moveDown', () => {
      expect(astronaut.getMovementMode()).toBe('flight');
      expect(astronaut.getMaxThrustCharges()).toBe(Infinity);
      expect(astronaut.getThrustCharges()).toBe(Infinity);

      // Flap repeatedly without rejection
      for (let i = 0; i < 10; i++) {
        expect(astronaut.thrust()).toBe(true);
        expect(astronaut.velocity).toBe(JUMP_VELOCITY);
      }

      astronaut.moveUp();
      expect(astronaut.velocity).toBe(-5);

      astronaut.moveDown();
      expect(astronaut.velocity).toBe(5);
    });

    it('enforces one thrust per landing in ground mode (maxThrustCharges: 1)', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 495);
      astro.setGroundY(520);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });

      expect(astro.getMovementMode()).toBe('ground');
      expect(astro.getMaxThrustCharges()).toBe(1);
      expect(astro.getThrustCharges()).toBe(1);

      // First thrust launches astronaut off ground and succeeds
      const firstThrust = astro.thrust();
      expect(firstThrust).toBe(true);
      expect(astro.velocity).toBe(JUMP_VELOCITY);
      expect(astro.getThrustCharges()).toBe(0);
      expect(astro.isGrounded).toBe(false);

      // Second airborne thrust attempt is REJECTED
      astro.velocity = 2.0; // falling under gravity
      const secondThrust = astro.thrust();
      expect(secondThrust).toBe(false);
      expect(astro.velocity).toBe(2.0); // unchanged!
      expect(astro.getThrustCharges()).toBe(0);

      // Landing recharges thrust
      astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
      astro.velocity = 10;
      astro.update(16.667); // Collides with ground
      expect(astro.isGrounded).toBe(true);
      expect(astro.getThrustCharges()).toBe(1);

      // Can thrust again after landing
      expect(astro.thrust()).toBe(true);
      expect(astro.velocity).toBe(JUMP_VELOCITY);
      expect(astro.getThrustCharges()).toBe(0);
    });

    it('supports future capacity of 2 (double-thrust without redesign)', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 100, 495);
      astro.setGroundY(520);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 2 });

      expect(astro.getMaxThrustCharges()).toBe(2);
      expect(astro.getThrustCharges()).toBe(2);

      // First thrust
      expect(astro.thrust()).toBe(true);
      expect(astro.velocity).toBe(JUMP_VELOCITY);
      expect(astro.getThrustCharges()).toBe(1);

      // Simulate partial flight / falling
      astro.velocity = 1.5;

      // Second airborne thrust succeeds (double jump!)
      expect(astro.thrust()).toBe(true);
      expect(astro.velocity).toBe(JUMP_VELOCITY);
      expect(astro.getThrustCharges()).toBe(0);

      // Third airborne thrust is rejected
      astro.velocity = 3.0;
      expect(astro.thrust()).toBe(false);
      expect(astro.velocity).toBe(3.0);

      // Landing recharges to full capacity of 2
      astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
      astro.velocity = 5;
      astro.update(16.667);
      expect(astro.isGrounded).toBe(true);
      expect(astro.getThrustCharges()).toBe(2);
    });

    it('ignores moveUp and moveDown direct overrides in ground mode', () => {
      astronaut.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astronaut.velocity = 0;

      astronaut.moveUp();
      expect(astronaut.velocity).toBe(0); // Ignored in ground mode

      astronaut.moveDown();
      expect(astronaut.velocity).toBe(0); // Ignored in ground mode

      // Horizontal movement remains fully responsive
      astronaut.moveLeft();
      expect(astronaut.horizontalVelocity).toBe(-5);
      astronaut.moveRight();
      expect(astronaut.horizontalVelocity).toBe(5);
    });

    it('restores full thrust capacity upon reset()', () => {
      astronaut.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astronaut.thrust();
      expect(astronaut.getThrustCharges()).toBe(0);

      astronaut.reset(150, 250);
      expect(astronaut.getThrustCharges()).toBe(1);
    });

    it('supports continuous held left/right movement across multiple update ticks', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 300, 495);
      astro.setGroundY(520);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });

      // Hold right across 5 frames
      for (let i = 0; i < 5; i++) {
        astro.moveRight(); // simulating held right input driving movement
        expect(astro.horizontalVelocity).toBe(5);
        astro.update(16.667);
      }
      expect(astro.worldX).toBeGreaterThan(320);

      // Hold left across 5 frames
      const currentX = astro.worldX;
      for (let i = 0; i < 5; i++) {
        astro.moveLeft(); // simulating held left input driving movement
        expect(astro.horizontalVelocity).toBe(-5);
        astro.update(16.667);
      }
      expect(astro.worldX).toBeLessThan(currentX);
    });

    it('demonstrates release behavior: decelerates to zero when directional input is released', () => {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, 300, 495);
      astro.setGroundY(520);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.isGrounded = true;

      // Nudge right
      astro.moveRight();
      expect(astro.horizontalVelocity).toBe(5);

      // Release: no moveRight calls during updates
      // Ground friction (0.5 per frame) decelerates horizontalVelocity to 0 in 10 frames
      for (let i = 0; i < 12; i++) {
        astro.update(16.667);
      }

      expect(astro.horizontalVelocity).toBe(0);
    });

    it('verifies that the highest Sector 02 orb (y = 360) is reachable with one thrust from ground', () => {
      const presentation = createMockPresentation();
      // Ground in Sector 02 is height 80 (y = 520). Astronaut center is at 495.
      const astro = new Astronaut(presentation, 150, 495);
      astro.setGroundY(520);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });

      expect(astro.isGrounded).toBe(false);
      // Initial grounded check
      astro.update(16.667);
      expect(astro.isGrounded).toBe(true);

      // Execute single thrust
      expect(astro.thrust()).toBe(true);
      expect(astro.velocity).toBe(JUMP_VELOCITY); // -5

      let minYReached = astro.sprite.y;
      // Simulate jump under gravity until apex
      for (let frame = 0; frame < 60; frame++) {
        astro.update(16.667);
        if (astro.sprite.y < minYReached) {
          minYReached = astro.sprite.y;
        }
      }

      // Discrete integration apex reaches y = 372.5
      expect(minYReached).toBeCloseTo(372.5, 1);

      // Astronaut hitbox at apex (height 35, bounds 352.5 to 387.5)
      const hitbox = astro.getHitbox();
      hitbox.minY = minYReached - 17.5;
      hitbox.maxY = minYReached + 17.5;

      // Sector 02 highest orb is at minY = 360. With radius 15, orb vertical bounds are 345 to 375.
      const highestOrbY = 360;
      const orbRadius = 15;
      const orbBottom = highestOrbY + orbRadius; // 375
      const orbTop = highestOrbY - orbRadius; // 345

      // Overlap condition: astro hitbox reaches above orbBottom
      const overlaps = hitbox.minY <= orbBottom && hitbox.maxY >= orbTop;
      expect(overlaps).toBe(true);
      expect(hitbox.minY).toBeLessThan(highestOrbY); // Hitbox extends above the orb center!
    });

  });

  describe('World-space movement (ground mode)', () => {
    function makeGroundAstronaut(x: number, worldWidth = 2400) {
      const presentation = createMockPresentation();
      const astro = new Astronaut(presentation, x, 400);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.setWorldWidth(worldWidth);
      return astro;
    }

    it('accumulates worldX beyond GAME_WIDTH when moving right', () => {
      const astro = makeGroundAstronaut(150);
      // Walk repeatedly right
      for (let i = 0; i < 200; i++) {
        astro.moveRight();
        astro.update(16.667);
      }
      expect(astro.worldX).toBeGreaterThan(GAME_WIDTH);
    });

    it('keeps its display object in world space in ground mode', () => {
      const astro = makeGroundAstronaut(150);
      astro.moveRight();
      astro.update(16.667);
      expect(astro.sprite.x).toBe(astro.worldX);
    });

    it('clamps worldX at world left bound (halfW = 25)', () => {
      const astro = makeGroundAstronaut(25);
      astro.moveLeft();
      astro.update(16.667);
      const halfW = ASTRONAUT.body.width / 2; // 25
      expect(astro.worldX).toBeGreaterThanOrEqual(halfW);
    });

    it('clamps worldX at world right bound (worldWidth - halfW)', () => {
      const astro = makeGroundAstronaut(2375, 2400);
      for (let i = 0; i < 50; i++) {
        astro.moveRight();
        astro.update(16.667);
      }
      const halfW = ASTRONAUT.body.width / 2; // 25
      expect(astro.worldX).toBeLessThanOrEqual(2400 - halfW);
    });

    it('resets worldX to the reset position', () => {
      const astro = makeGroundAstronaut(150);
      for (let i = 0; i < 100; i++) {
        astro.moveRight();
        astro.update(16.667);
      }
      expect(astro.worldX).toBeGreaterThan(150);
      astro.reset(150, 400);
      expect(astro.worldX).toBe(150);
    });
  });

  describe('World-space movement (flight mode)', () => {
    it('clamps sprite.x at left viewport boundary in flight mode', () => {
      const astro = new Astronaut(PIXI.Texture.EMPTY, 25, 300);
      astro.setMovementConfig({ mode: 'flight' });
      for (let i = 0; i < 20; i++) {
        astro.moveLeft();
        astro.update(16.667);
      }
      const halfW = ASTRONAUT.body.width / 2;
      expect(astro.sprite.x).toBeGreaterThanOrEqual(halfW);
      expect(astro.worldX).toBe(astro.sprite.x);
    });

    it('clamps sprite.x at right viewport boundary in flight mode', () => {
      const astro = new Astronaut(PIXI.Texture.EMPTY, GAME_WIDTH - 25, 300);
      astro.setMovementConfig({ mode: 'flight' });
      for (let i = 0; i < 20; i++) {
        astro.moveRight();
        astro.update(16.667);
      }
      const halfW = ASTRONAUT.body.width / 2;
      expect(astro.sprite.x).toBeLessThanOrEqual(GAME_WIDTH - halfW);
      expect(astro.worldX).toBe(astro.sprite.x);
    });
  });

  describe('Ground traversal walking animation transitions', () => {
    it('plays still animation when stationary on solid ground in ground mode', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;

      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('still');
    });

    it('plays walk animation when moving right while grounded in ground mode', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;

      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('still');
      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('walk');
    });

    it('plays walk_left animation when moving left while grounded in ground mode', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;

      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('still');
      astro.moveLeft();
      expect(astro.getCurrentAnimation()).toBe('walk_left');
    });

    it('returns to still when horizontal movement halts via friction', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;

      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('walk');

      // Update multiple ticks so friction decelerates horizontal velocity to 0
      for (let i = 0; i < 30; i++) {
        astro.update(16.667);
      }
      expect(astro.horizontalVelocity).toBe(0);
      expect(astro.getCurrentAnimation()).toBe('still');
    });

    it('gracefully falls back to idle when stationary on ground if still animation is unavailable', () => {
      const astro = new Astronaut(createMockPresentation(false), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;

      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('walk');

      for (let i = 0; i < 30; i++) {
        astro.update(16.667);
      }
      expect(astro.horizontalVelocity).toBe(0);
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('triggers thrust when jumping and resumes still when landing stationary', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;
      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('still');

      astro.thrust();
      expect(astro.isGrounded).toBe(false);
      expect(astro.getCurrentAnimation()).toBe('thrust');

      // Falling back to ground without horizontal velocity
      astro.velocity = 5;
      astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
      astro.update(16.667);

      expect(astro.isGrounded).toBe(true);
      expect(astro.getCurrentAnimation()).toBe('still');
    });

    it('triggers thrust when jumping and resumes walking when landing while still moving', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;

      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('walk');

      astro.thrust();
      expect(astro.isGrounded).toBe(false);
      expect(astro.getCurrentAnimation()).toBe('thrust');

      // Moving right while in air, then landing on ground
      astro.moveRight();
      // Falling back to ground
      astro.velocity = 5;
      astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
      astro.update(16.667);

      expect(astro.isGrounded).toBe(true);
      expect(astro.getCurrentAnimation()).toBe('walk');
    });

    it('does not trigger walking or still animation in flight mode', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 300);
      astro.setMovementConfig({ mode: 'flight' });

      expect(astro.getCurrentAnimation()).toBe('idle');
      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('idle');
      astro.moveLeft();
      expect(astro.getCurrentAnimation()).toBe('idle');
      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('cleans up still animation without leakage when transitioning from ground to flight mode', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;
      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('still');

      // Level transition: ground level -> flight level
      astro.setMovementConfig({ mode: 'flight' });
      expect(astro.getMovementMode()).toBe('flight');
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('returns to idle when walking off a ledge into the air', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 400);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.isGrounded = true;
      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('walk');

      // Step off ledge: isGrounded becomes false
      astro.isGrounded = false;
      astro.update(16.667);
      expect(astro.getCurrentAnimation()).toBe('idle');
    });

    it('preserves fixed collision hitbox dimensions regardless of animation state', () => {
      const astro = new Astronaut(createMockPresentation(), 200, 495);
      astro.setMovementConfig({ mode: 'ground', maxThrustCharges: 1 });
      astro.setGroundY(520);
      astro.isGrounded = true;
      astro.update(16.667);

      expect(astro.getCurrentAnimation()).toBe('still');
      const stillHitbox = astro.getHitbox();
      expect(stillHitbox.maxX - stillHitbox.minX).toBe(35);
      expect(stillHitbox.maxY - stillHitbox.minY).toBe(35);

      astro.moveRight();
      expect(astro.getCurrentAnimation()).toBe('walk');
      const walkHitbox = astro.getHitbox();
      expect(walkHitbox.maxX - walkHitbox.minX).toBe(35);
      expect(walkHitbox.maxY - walkHitbox.minY).toBe(35);

      astro.moveLeft();
      expect(astro.getCurrentAnimation()).toBe('walk_left');
      const walkLeftHitbox = astro.getHitbox();
      expect(walkLeftHitbox.maxX - walkLeftHitbox.minX).toBe(35);
      expect(walkLeftHitbox.maxY - walkLeftHitbox.minY).toBe(35);
    });
  });
});
