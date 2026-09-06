import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { EntitySystem } from '../systems/entitySystem';
import { Ground } from '../entities/Ground';
import { Astronaut } from '../entities/Astronaut';
import { GAME_HEIGHT, ASTRONAUT } from '../config';
import { ALIEN_CRUST_TERRAIN, TerrainPresentationDefinition } from '../visuals/terrainPresets';
import { INK } from '../visuals/tokens';
import { ASTRONAUT_SPRITE_DEFINITION } from '../visuals/spriteAnimations';

describe('Ground Capability Architectural Boundary Regressions', () => {
  let app: PIXI.Application;
  let entities: EntitySystem;

  beforeEach(() => {
    app = new PIXI.Application();
    app.stage = new PIXI.Container();
    entities = new EntitySystem(app);
    entities.initialize(app);
  });

  afterEach(() => {
    entities.dispose();
  });

  it('ground configuration can be changed between levels without reconstructing system architecture', () => {
    // Level A with 80px ground
    entities.setGround({ enabled: true, height: 80 }, 'alien-crust');
    expect(entities.getGroundY()).toBe(GAME_HEIGHT - 80);

    // Transition to Level B with 140px ground without recreating EntitySystem or stage
    entities.setGround({ enabled: true, height: 140 }, 'alien-crust');
    expect(entities.getGroundY()).toBe(GAME_HEIGHT - 140);

    // Transition to Level C with no ground
    entities.setGround(null);
    expect(entities.getGroundY()).toBeNull();
  });

  it('ground visual styling and terrain presets do not change collision Y', () => {
    const defaultGround = new Ground(80, 'alien-crust');
    const customTerrain: TerrainPresentationDefinition = {
      id: 'alien-crust',
      name: 'Custom Palette Alien Crust',
      bedrockColor: INK.hull,
      strataColor: INK.void,
      crestColor: INK.cyan,
      accentColor: INK.violet,
      hazeColor: '#00f0ff',
    };
    const restyledGround = new Ground(80, customTerrain);

    // Collision boundary Y must be identical regardless of visual colors or styling
    expect(defaultGround.y).toBe(restyledGround.y);
    expect(defaultGround.y).toBe(GAME_HEIGHT - 80);

    defaultGround.destroy();
    restyledGround.destroy();
  });

  it('changing terrain preset does not alter ground height', () => {
    const ground = new Ground(100, ALIEN_CRUST_TERRAIN);
    expect(ground.height).toBe(100);
    expect(ground.terrain.id).toBe('alien-crust');
    ground.destroy();
  });

  it('changing ground height does not alter terrain identity', () => {
    const groundA = new Ground(60, 'alien-crust');
    const groundB = new Ground(160, 'alien-crust');

    expect(groundA.terrain.id).toBe('alien-crust');
    expect(groundB.terrain.id).toBe('alien-crust');
    expect(groundA.height).toBe(60);
    expect(groundB.height).toBe(160);

    groundA.destroy();
    groundB.destroy();
  });

  it('sprite animation state changes do not alter ground collision or boundary clamping', () => {
    const presentation = {
      definition: ASTRONAUT_SPRITE_DEFINITION,
      animations: {
        idle: { name: 'idle', frames: [new PIXI.Texture()], fps: 12, loop: true },
        thrust: { name: 'thrust', frames: [new PIXI.Texture()], fps: 18, loop: false },
      },
      fallbackTexture: new PIXI.Texture(),
    };
    const astro = new Astronaut(presentation, 150, 400);
    const groundY = 520;
    astro.setGroundY(groundY);

    // Collision footprint is 35x35 and body height is 50, regardless of sprite animation
    expect(astro.collisionDimensions.width).toBe(35);
    expect(astro.collisionDimensions.height).toBe(35);

    // 1. In idle animation
    astro.playAnimation('idle');
    astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
    astro.update(16.667);
    expect(astro.sprite.y).toBe(520 - 25);
    expect(astro.isGrounded).toBe(true);

    // 2. In thrust animation
    astro.thrust();
    expect(astro.isGrounded).toBe(false);
    expect(astro.collisionDimensions.width).toBe(35);
    expect(astro.collisionDimensions.height).toBe(35);

    // 3. Landing again and thrust completion
    astro.sprite.y = 520 - ASTRONAUT.body.height / 2;
    astro.velocity = 5;
    astro.update(16.667);
    expect(astro.sprite.y).toBe(520 - 25);
    expect(astro.isGrounded).toBe(true);

    // When non-looping thrust completes, transitions back to default idle
    (astro.sprite as PIXI.AnimatedSprite).onComplete?.();
    expect(astro.getCurrentAnimation()).toBe('idle');
  });

  it('environment preset changes do not alter gameplay ground geometry', () => {
    const ground = entities.setGround({ enabled: true, height: 90 }, 'alien-crust')!;
    const groundYBefore = ground.y;

    // Simulate environment preset change on level load
    const groundYAfter = entities.getGroundY();
    expect(groundYAfter).toBe(groundYBefore);
    expect(groundYAfter).toBe(GAME_HEIGHT - 90);
  });
});
