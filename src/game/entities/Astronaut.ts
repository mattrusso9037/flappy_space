import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT, GAME_WIDTH, ASTRONAUT } from '../config';
import { getLogger } from '../../utils/logger';
import { damp, MOTION } from '../visuals/tokens';
import { ResolvedSpritePresentation } from '../visuals/spriteAnimationTypes';
import { ASTRONAUT_SPRITE_DEFINITION, advanceSpriteAnimation, createAnimatedSprite } from '../visuals/spriteAnimations';

const logger = getLogger('Astronaut');

const HORIZONTAL_SPEED = 5;
const VERTICAL_SPEED = 5;

/**
 * Astronaut entity representing the player character.
 * Owns position, velocity, dimensions, and visual display object.
 * Presentation derives from canonical ResolvedSpritePresentation metadata.
 * Does not subscribe to global event buses; actions are invoked by systems.
 */
export class Astronaut {
  sprite: PIXI.Sprite;
  velocity: number;
  horizontalVelocity: number = 0;
  rotation: number;
  dead: boolean;
  thrustRemaining = 0;
  public readonly collisionDimensions = { width: 35, height: 35 };
  private deathElapsed = 0;
  private readonly presentation: ResolvedSpritePresentation;
  private currentAnimationState: string = 'none';

  constructor(source: ResolvedSpritePresentation | PIXI.Texture, x: number, y: number) {
    if (source instanceof PIXI.Texture) {
      this.presentation = {
        definition: ASTRONAUT_SPRITE_DEFINITION,
        animations: {},
        fallbackTexture: source,
      };
    } else {
      this.presentation = source;
    }

    const defaultAnim = this.presentation.definition.defaultAnimation || 'idle';
    this.sprite = createAnimatedSprite(this.presentation, defaultAnim);
    this.sprite.x = x;
    this.sprite.y = y;

    if (this.presentation.animations[defaultAnim]) {
      this.currentAnimationState = defaultAnim;
    } else {
      this.currentAnimationState = 'none';
    }

    this.velocity = 0;
    this.rotation = 0;
    this.dead = false;

    logger.info('Astronaut created');
  }

  update(deltaMS: number = 16.667): void {
    if (this.dead) return;

    // Scale delta time to make physics consistent (normalize to 60 FPS time step)
    const delta = deltaMS / 16.667;

    // Apply gravity
    this.velocity += GRAVITY * delta;
    if (this.velocity > MAX_VELOCITY) {
      this.velocity = MAX_VELOCITY;
    }

    // Update position
    this.sprite.y += this.velocity * delta;
    this.sprite.x += this.horizontalVelocity * delta;

    // Apply horizontal deceleration (friction)
    if (this.horizontalVelocity > 0) {
      this.horizontalVelocity = Math.max(0, this.horizontalVelocity - 0.1 * delta);
    } else if (this.horizontalVelocity < 0) {
      this.horizontalVelocity = Math.min(0, this.horizontalVelocity + 0.1 * delta);
    }

    // Update rotation based on velocity
    const targetRotation = (this.velocity / MAX_VELOCITY) * (Math.PI / 6); // 30 degrees max
    this.rotation = damp(this.rotation, targetRotation, deltaMS / 1000);
    this.sprite.rotation = this.rotation;

    // Check vertical boundaries using logical body dimensions (never visual frame dimensions)
    const halfH = ASTRONAUT.body.height / 2;
    const halfW = ASTRONAUT.body.width / 2;

    if (this.sprite.y - halfH < 0) {
      this.sprite.y = halfH;
      this.velocity = 0;
      logger.info('Hit top boundary');
    }

    if (this.sprite.y + halfH > GAME_HEIGHT) {
      this.sprite.y = GAME_HEIGHT - halfH;
      this.velocity = 0;
      logger.info('Hit bottom boundary - dying');
      this.die();
    }

    // Check horizontal boundaries using logical body dimensions
    if (this.sprite.x - halfW < 0) {
      this.sprite.x = halfW;
      this.horizontalVelocity = 0;
      logger.info('Hit left boundary');
    }

    if (this.sprite.x + halfW > GAME_WIDTH) {
      this.sprite.x = GAME_WIDTH - halfW;
      this.horizontalVelocity = 0;
      logger.info('Hit right boundary');
    }
  }

  getHitbox(): PIXI.Bounds {
    const bounds = new PIXI.Bounds();
    const width = this.collisionDimensions.width;
    const height = this.collisionDimensions.height;

    bounds.minX = this.sprite.x - width / 2;
    bounds.maxX = this.sprite.x + width / 2;
    bounds.minY = this.sprite.y - height / 2;
    bounds.maxY = this.sprite.y + height / 2;

    return bounds;
  }

  playAnimation(name: string): void {
    const anim = this.presentation.animations[name];
    if (!anim || anim.frames.length === 0) {
      logger.warn(`Animation '${name}' not available on astronaut presentation`);
      return;
    }

    if (!(this.sprite instanceof PIXI.AnimatedSprite)) {
      return;
    }

    this.currentAnimationState = name;
    const animSprite = this.sprite;
    animSprite.textures = anim.frames;
    animSprite.animationSpeed = anim.fps / 60;
    animSprite.loop = anim.loop;

    // Ensure scale matches target height
    const targetHeight = this.presentation.definition.visualDimensions?.targetHeight;
    const baseTexture = anim.frames[0];
    if (targetHeight && baseTexture && baseTexture.height > 0) {
      animSprite.scale.set(targetHeight / baseTexture.height);
    }

    if (anim.loop) {
      animSprite.onComplete = undefined;
      animSprite.gotoAndPlay(0);
    } else {
      // Non-looping animation: return to default animation on complete
      animSprite.onComplete = () => {
        if (this.dead) return;
        // Stale completion guard: only transition if still playing this animation
        if (this.currentAnimationState === name) {
          const defaultAnim = this.presentation.definition.defaultAnimation || 'idle';
          this.playAnimation(defaultAnim);
        }
      };
      animSprite.gotoAndPlay(0);
    }
  }

  thrust(): void {
    if (this.dead) {
      logger.debug('Thrust attempted but astronaut is dead');
      return;
    }
    logger.debug(`Thrust! Setting velocity to ${JUMP_VELOCITY}`);
    this.velocity = JUMP_VELOCITY;
    this.thrustRemaining = MOTION.thrust;

    // Only start thrust animation if not already playing thrust (repeated flap does not restart animation)
    if (this.currentAnimationState !== 'thrust') {
      this.playAnimation('thrust');
    }
  }

  flap(): void {
    this.thrust();
  }

  moveLeft(): void {
    if (this.dead) {
      logger.debug('Move left attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move left! Setting horizontal velocity to -${HORIZONTAL_SPEED}`);
    this.horizontalVelocity = -HORIZONTAL_SPEED;
  }

  moveRight(): void {
    if (this.dead) {
      logger.debug('Move right attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move right! Setting horizontal velocity to ${HORIZONTAL_SPEED}`);
    this.horizontalVelocity = HORIZONTAL_SPEED;
  }

  moveUp(): void {
    if (this.dead) {
      logger.debug('Move up attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move up! Setting vertical velocity to -${VERTICAL_SPEED}`);
    this.velocity = -VERTICAL_SPEED;
    this.thrustRemaining = MOTION.thrust;

    if (this.currentAnimationState !== 'thrust') {
      this.playAnimation('thrust');
    }
  }

  moveDown(): void {
    if (this.dead) {
      logger.debug('Move down attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move down! Setting vertical velocity to ${VERTICAL_SPEED}`);
    this.velocity = VERTICAL_SPEED;
  }

  die(): void {
    logger.info('Dying...');
    this.dead = true;
    this.sprite.tint = 0xFF5555;
    if (this.sprite instanceof PIXI.AnimatedSprite) {
      this.sprite.stop();
      this.sprite.onComplete = undefined;
    }
  }

  /** Presentation only; no collision dimensions, physics, or source texture changes. */
  updatePresentation(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    if (!this.dead) advanceSpriteAnimation(this.sprite, seconds);
    this.thrustRemaining = Math.max(0, this.thrustRemaining - seconds);
    if (this.dead && this.deathElapsed < MOTION.impact) {
      const step = Math.min(seconds, MOTION.impact - this.deathElapsed);
      this.deathElapsed += step;
      this.sprite.rotation += step * 2.5;
      this.sprite.alpha = 1 - (this.deathElapsed / MOTION.impact) * 0.45;
    }
  }

  reset(x: number, y: number): void {
    this.sprite.x = x;
    this.sprite.y = y;
    this.velocity = 0;
    this.horizontalVelocity = 0;
    this.rotation = 0;
    this.dead = false;
    this.sprite.tint = 0xFFFFFF;
    this.sprite.rotation = 0;
    this.sprite.alpha = 1;
    this.thrustRemaining = 0;
    this.deathElapsed = 0;

    const defaultAnim = this.presentation.definition.defaultAnimation || 'idle';
    if (this.presentation.animations[defaultAnim]) {
      this.playAnimation(defaultAnim);
    } else if (this.sprite instanceof PIXI.AnimatedSprite) {
      this.sprite.gotoAndStop(0);
    }
  }

  getCurrentAnimation(): string {
    return this.currentAnimationState;
  }
}