import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT, GAME_WIDTH, ASTRONAUT } from '../config';
import { getLogger } from '../../utils/logger';

const logger = getLogger('Astronaut');

import { damp, MOTION } from '../visuals/tokens';

const HORIZONTAL_SPEED = 5;
const VERTICAL_SPEED = 5;

const DEFAULT_IDLE_FPS = 3;
const DEFAULT_THRUST_FPS = 3;

export interface AstronautAnimationMap {
  idle?: PIXI.Texture[];
  thrust?: PIXI.Texture[];
  idleFps?: number;
  thrustFps?: number;
  [key: string]: unknown;
}

export type AstronautVisualSource =
  | PIXI.Texture
  | PIXI.Texture[]
  | AstronautAnimationMap;

/**
 * Astronaut entity representing the player character.
 * Owns position, velocity, dimensions, and visual display object.
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
  private idleFrames: PIXI.Texture[] = [];
  private thrustFrames: PIXI.Texture[] = [];
  private idleFps: number = DEFAULT_IDLE_FPS;
  private thrustFps: number = DEFAULT_THRUST_FPS;
  private currentAnimationState: 'idle' | 'thrust' | 'none' = 'none';

  constructor(textureOrFrames: AstronautVisualSource, x: number, y: number) {
    if (Array.isArray(textureOrFrames)) {
      this.thrustFrames = textureOrFrames;
      const anim = new PIXI.AnimatedSprite(textureOrFrames);
      anim.animationSpeed = 1 / 60;
      anim.loop = false;
      anim.onComplete = () => {
        anim.gotoAndStop(0);
      };
      anim.gotoAndStop(0);
      this.sprite = anim;
      // Preserve natural aspect ratio (128:341) to prevent smushing
      this.sprite.scale.set(0.28);
      this.currentAnimationState = 'thrust';
    } else if (textureOrFrames instanceof PIXI.Texture) {
      this.sprite = new PIXI.Sprite(textureOrFrames);
      this.sprite.width = 50;
      this.sprite.height = 50;
      this.currentAnimationState = 'none';
    } else if (typeof textureOrFrames === 'object' && textureOrFrames !== null) {
      this.idleFrames = textureOrFrames.idle ?? [];
      this.thrustFrames = textureOrFrames.thrust ?? [];
      if (typeof textureOrFrames.idleFps === 'number') this.idleFps = textureOrFrames.idleFps;
      if (typeof textureOrFrames.thrustFps === 'number') this.thrustFps = textureOrFrames.thrustFps;

      if (this.idleFrames.length > 0) {
        const anim = new PIXI.AnimatedSprite(this.idleFrames);
        anim.animationSpeed = this.idleFps / 60;
        anim.loop = true;
        anim.play();
        this.sprite = anim;
        this.sprite.scale.set(0.28);
        this.currentAnimationState = 'idle';
      } else if (this.thrustFrames.length > 0) {
        const anim = new PIXI.AnimatedSprite(this.thrustFrames);
        anim.animationSpeed = this.thrustFps / 60;
        anim.loop = false;
        anim.gotoAndStop(0);
        this.sprite = anim;
        this.sprite.scale.set(0.28);
        this.currentAnimationState = 'thrust';
      } else {
        this.sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        this.sprite.width = 50;
        this.sprite.height = 50;
        this.currentAnimationState = 'none';
      }
    } else {
      this.sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
      this.sprite.width = 50;
      this.sprite.height = 50;
      this.currentAnimationState = 'none';
    }
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.anchor.set(0.5);

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

    // Check vertical boundaries using logical body dimensions
    const halfH = ASTRONAUT.height / 2;
    const halfW = ASTRONAUT.width / 2;

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

    // Check horizontal boundaries
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

  private triggerThrustAnimation(): void {
    if (!(this.sprite instanceof PIXI.AnimatedSprite)) return;
    const anim = this.sprite;

    if (this.thrustFrames.length > 0) {
      anim.textures = this.thrustFrames;
      anim.animationSpeed = this.thrustFps / 60;
      anim.loop = false;
      this.currentAnimationState = 'thrust';
      anim.onComplete = () => {
        if (this.dead) return;
        if (this.idleFrames.length > 0) {
          anim.textures = this.idleFrames;
          anim.animationSpeed = this.idleFps / 60;
          anim.loop = true;
          anim.gotoAndPlay(0);
          this.currentAnimationState = 'idle';
        } else {
          anim.gotoAndStop(0);
        }
      };
      anim.gotoAndPlay(0);
    } else {
      anim.gotoAndPlay(0);
    }
  }

  flap(): void {
    if (this.dead) {
      logger.debug('Flap attempted but astronaut is dead');
      return;
    }
    logger.debug(`Flap! Setting velocity to ${JUMP_VELOCITY}`);
    this.velocity = JUMP_VELOCITY;
    this.thrustRemaining = MOTION.thrust;
    this.triggerThrustAnimation();
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
    this.triggerThrustAnimation();
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
    }
  }

  /** Presentation only; no collision dimensions, physics, or source texture changes. */
  updatePresentation(seconds: number): void {
    this.thrustRemaining = Math.max(0, this.thrustRemaining - seconds);
    if (this.dead && this.deathElapsed < MOTION.impact) {
      const step = Math.min(seconds, MOTION.impact - this.deathElapsed);
      this.deathElapsed += step;
      this.sprite.rotation += step * 2.5;
      this.sprite.alpha = 1 - this.deathElapsed / MOTION.impact * 0.45;
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
    if (this.sprite instanceof PIXI.AnimatedSprite) {
      if (this.idleFrames.length > 0) {
        this.sprite.textures = this.idleFrames;
        this.sprite.animationSpeed = this.idleFps / 60;
        this.sprite.loop = true;
        this.sprite.gotoAndPlay(0);
        this.currentAnimationState = 'idle';
      } else {
        this.sprite.gotoAndStop(0);
      }
    }
  }

  getCurrentAnimation(): 'idle' | 'thrust' | 'none' {
    return this.currentAnimationState;
  }

  setAnimations(animations: AstronautAnimationMap): void {
    this.idleFrames = animations.idle ?? [];
    this.thrustFrames = animations.thrust ?? [];
    if (typeof animations.idleFps === 'number') this.idleFps = animations.idleFps;
    if (typeof animations.thrustFps === 'number') this.thrustFps = animations.thrustFps;
    if (this.sprite instanceof PIXI.AnimatedSprite && this.idleFrames.length > 0) {
      this.sprite.textures = this.idleFrames;
      this.sprite.animationSpeed = this.idleFps / 60;
      this.sprite.loop = true;
      this.sprite.gotoAndPlay(0);
      this.currentAnimationState = 'idle';
    }
  }

  playAnimation(frames: PIXI.Texture[], fps = 8, loop = true): void {
    if (this.sprite instanceof PIXI.AnimatedSprite && frames.length > 0) {
      this.sprite.textures = frames;
      this.sprite.animationSpeed = fps / 60;
      this.sprite.loop = loop;
      this.sprite.gotoAndPlay(0);
    }
  }
}