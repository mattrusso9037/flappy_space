import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT, GAME_WIDTH, ASTRONAUT } from '../config';
import { getLogger } from '../../utils/logger';
import { damp, MOTION } from '../visuals/tokens';
import { ResolvedSpritePresentation } from '../visuals/spriteAnimationTypes';
import { ASTRONAUT_SPRITE_DEFINITION, advanceSpriteAnimation, createAnimatedSprite } from '../visuals/spriteAnimations';
import { MovementGameplayDefinition, MovementMode } from '../campaign/campaignTypes';

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
  public isGrounded: boolean = false;
  private groundY: number | null = null;
  private deathElapsed = 0;
  private readonly presentation: ResolvedSpritePresentation;
  private currentAnimationState: string = 'none';

  private movementMode: MovementMode = 'flight';
  private maxThrustCharges: number = Infinity;
  private thrustCharges: number = Infinity;
  /** World-space X position. In ground mode, this is the canonical position.
   *  In flight mode, mirrors sprite.x (viewport-space). */
  public worldX: number = 0;
  /** World width in game pixels. Used to clamp worldX in ground mode. */
  private worldWidth: number = 0;
  private loopingWorld = false;

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
    this.worldX = x;

    logger.info('Astronaut created');
  }

  public setMovementConfig(config?: MovementGameplayDefinition): void {
    if (!config || config.mode === 'flight') {
      this.movementMode = 'flight';
      this.maxThrustCharges = Infinity;
      this.thrustCharges = Infinity;
      if (this.currentAnimationState === 'still' || this.currentAnimationState === 'walk' || this.currentAnimationState === 'walk_left') {
        const defaultAnim = this.presentation.definition.defaultAnimation || 'idle';
        this.playAnimation(defaultAnim);
      }
    } else {
      this.movementMode = 'ground';
      this.maxThrustCharges = config.maxThrustCharges;
      this.thrustCharges = this.maxThrustCharges;
      if (this.isGrounded && Math.abs(this.horizontalVelocity) <= 0.1 && this.presentation.animations['still']) {
        this.playAnimation('still');
      }
    }
    logger.info(`Movement config set: mode=${this.movementMode}, maxThrustCharges=${this.maxThrustCharges}`);
  }

  public getMovementMode(): MovementMode {
    return this.movementMode;
  }

  public getMaxThrustCharges(): number {
    return this.maxThrustCharges;
  }

  public getThrustCharges(): number {
    return this.thrustCharges;
  }

  /**
   * Set the world width for ground-mode clamping.
   * Call from GameRuntime when loading a level with a WorldDefinition.
   */
  public setWorldWidth(width: number, looping = false): void {
    this.worldWidth = width;
    this.loopingWorld = looping;
  }

  public rechargeThrust(): void {
    this.thrustCharges = this.maxThrustCharges;
    logger.debug(`Thrust recharged to ${this.thrustCharges}`);
  }

  public setGroundY(groundY: number | null): void {
    this.groundY = groundY;
  }

  public getGroundY(): number | null {
    return this.groundY;
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
    if (this.movementMode === 'ground') {
      // Ground mode: worldX is canonical and the display object stays in world space.
      // RenderSystem.worldCamera is solely responsible for converting it to screen space.
      this.worldX += this.horizontalVelocity * delta;
      this.sprite.x = this.worldX;
    } else {
      // Flight mode: sprite.x IS the world position (viewport-space).
      this.sprite.x += this.horizontalVelocity * delta;
      this.worldX = this.sprite.x;
    }

    // Apply horizontal deceleration (crisp friction on solid ground; gentle drift in air/space)
    const friction = (this.isGrounded && this.movementMode === 'ground') ? 0.5 : 0.1;
    if (this.horizontalVelocity > 0) {
      this.horizontalVelocity = Math.max(0, this.horizontalVelocity - friction * delta);
    } else if (this.horizontalVelocity < 0) {
      this.horizontalVelocity = Math.min(0, this.horizontalVelocity + friction * delta);
    }

    // Ground movement animation state transitions
    if (this.movementMode === 'ground') {
      if (this.isGrounded) {
        if (this.horizontalVelocity > 0.1) {
          if (this.presentation.animations['walk'] && this.currentAnimationState !== 'walk') {
            this.playAnimation('walk');
          }
        } else if (this.horizontalVelocity < -0.1) {
          const anim = this.presentation.animations['walk_left'] ? 'walk_left' : 'walk';
          if (this.presentation.animations[anim] && this.currentAnimationState !== anim) {
            this.playAnimation(anim);
          }
        } else {
          const stillAnim = this.presentation.animations['still'] ? 'still' : (this.presentation.definition.defaultAnimation || 'idle');
          if (this.currentAnimationState !== stillAnim && this.currentAnimationState !== 'thrust') {
            this.playAnimation(stillAnim);
          }
        }
      } else {
        if (this.currentAnimationState === 'walk' || this.currentAnimationState === 'walk_left' || this.currentAnimationState === 'walk_right' || this.currentAnimationState === 'still') {
          const defaultAnim = this.presentation.definition.defaultAnimation || 'idle';
          this.playAnimation(defaultAnim);
        }
      }
    }

    // Update rotation based on velocity (stand upright when grounded on terrain)
    const targetRotation = this.isGrounded ? 0 : (this.velocity / MAX_VELOCITY) * (Math.PI / 6); // 30 degrees max
    this.rotation = damp(this.rotation, targetRotation, deltaMS / 1000);
    this.sprite.rotation = this.rotation;

    // Check vertical boundaries using logical body dimensions (never visual frame dimensions)
    const halfH = ASTRONAUT.body.height / 2;
    if (this.sprite.y - halfH < 0) {
      this.sprite.y = halfH;
      this.velocity = 0;
      logger.info('Hit top boundary');
    }

    if (this.groundY !== null) {
      // Solid planetary ground collision
      if (this.sprite.y + halfH >= this.groundY) {
        this.sprite.y = this.groundY - halfH;
        this.velocity = 0;
        if (!this.isGrounded) {
          this.isGrounded = true;
          this.rechargeThrust();
          if (!this.dead) {
            if (this.movementMode === 'ground' && Math.abs(this.horizontalVelocity) > 0.1) {
              const anim = this.horizontalVelocity < -0.1 && this.presentation.animations['walk_left'] ? 'walk_left' : 'walk';
              if (this.presentation.animations[anim] && this.currentAnimationState !== anim) {
                this.playAnimation(anim);
              }
            } else {
              const groundedStillAnim = this.movementMode === 'ground' && this.presentation.animations['still']
                ? 'still'
                : (this.presentation.definition.defaultAnimation || 'idle');
              if (this.currentAnimationState !== groundedStillAnim) {
                this.playAnimation(groundedStillAnim);
              }
            }
          }
        }
      } else {
        this.isGrounded = false;
      }
    } else {
      // Space bottom boundary (lethal)
      this.isGrounded = false;
      if (this.sprite.y + halfH > GAME_HEIGHT) {
        this.sprite.y = GAME_HEIGHT - halfH;
        this.velocity = 0;
        logger.info('Hit bottom boundary - dying');
        this.die();
      }
    }

    // Horizontal boundaries
    if (this.movementMode === 'ground') {
      // Ground mode: clamp worldX to world bounds and keep the display in world space.
      const halfW = ASTRONAUT.body.width / 2;
      const maxX = this.worldWidth > 0 ? this.worldWidth - halfW : Number.POSITIVE_INFINITY;
      if (!this.loopingWorld) this.worldX = Math.max(halfW, Math.min(maxX, this.worldX));
      this.sprite.x = this.worldX;
    } else {
      // Flight mode: clamp sprite.x to viewport bounds.
      const halfW = ASTRONAUT.body.width / 2;
      if (this.sprite.x - halfW <= 0) {
        this.sprite.x = halfW;
        this.horizontalVelocity = 0;
        logger.debug('Hit left boundary');
      }
      if (this.sprite.x + halfW >= GAME_WIDTH) {
        this.sprite.x = GAME_WIDTH - halfW;
        this.horizontalVelocity = 0;
        logger.debug('Hit right boundary');
      }
      this.worldX = this.sprite.x;
    }
  }

  getHitbox(): PIXI.Bounds {
    return this.createHitbox(this.movementMode === 'ground' ? this.worldX : this.sprite.x);
  }

  /** Display-local hitbox. RenderSystem applies the camera for debug presentation. */
  getScreenHitbox(): PIXI.Bounds {
    return this.createHitbox(this.sprite.x);
  }

  private createHitbox(x: number): PIXI.Bounds {
    const bounds = new PIXI.Bounds();
    const width = this.collisionDimensions.width;
    const height = this.collisionDimensions.height;

    bounds.minX = x - width / 2;
    bounds.maxX = x + width / 2;
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
      // Non-looping animation: return to appropriate state on complete
      animSprite.onComplete = () => {
        if (this.dead) return;
        // Stale completion guard: only transition if still playing this animation
        if (this.currentAnimationState === name) {
          if (this.movementMode === 'ground' && this.isGrounded) {
            if (this.horizontalVelocity > 0.1) {
              this.playAnimation('walk');
            } else if (this.horizontalVelocity < -0.1) {
              this.playAnimation(this.presentation.animations['walk_left'] ? 'walk_left' : 'walk');
            } else {
              const stillAnim = this.presentation.animations['still'] ? 'still' : (this.presentation.definition.defaultAnimation || 'idle');
              this.playAnimation(stillAnim);
            }
          } else {
            const defaultAnim = this.presentation.definition.defaultAnimation || 'idle';
            this.playAnimation(defaultAnim);
          }
        }
      };
      animSprite.gotoAndPlay(0);
    }
  }

  thrust(): boolean {
    if (this.dead) {
      logger.debug('Thrust attempted but astronaut is dead');
      return false;
    }
    if (this.thrustCharges <= 0) {
      logger.debug('Thrust rejected - no thrust charges remaining');
      return false;
    }
    if (Number.isFinite(this.thrustCharges)) {
      this.thrustCharges--;
    }
    logger.debug(`Thrust! Setting velocity to ${JUMP_VELOCITY}, remaining charges: ${this.thrustCharges}`);
    this.velocity = JUMP_VELOCITY;
    this.thrustRemaining = MOTION.thrust;
    this.isGrounded = false;

    // Only start thrust animation if not already playing thrust (repeated flap does not restart animation)
    if (this.currentAnimationState !== 'thrust') {
      this.playAnimation('thrust');
    }
    return true;
  }

  flap(): boolean {
    return this.thrust();
  }

  moveLeft(): void {
    if (this.dead) {
      logger.debug('Move left attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move left! Setting horizontal velocity to -${HORIZONTAL_SPEED}`);
    this.horizontalVelocity = -HORIZONTAL_SPEED;
    if (this.movementMode === 'ground' && this.isGrounded) {
      const anim = this.presentation.animations['walk_left'] ? 'walk_left' : 'walk';
      if (this.presentation.animations[anim] && this.currentAnimationState !== anim) {
        this.playAnimation(anim);
      }
    }
  }

  moveRight(): void {
    if (this.dead) {
      logger.debug('Move right attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move right! Setting horizontal velocity to ${HORIZONTAL_SPEED}`);
    this.horizontalVelocity = HORIZONTAL_SPEED;
    if (this.movementMode === 'ground' && this.isGrounded) {
      if (this.presentation.animations['walk'] && this.currentAnimationState !== 'walk') {
        this.playAnimation('walk');
      }
    }
  }

  moveUp(): void {
    if (this.dead) {
      logger.debug('Move up attempted but astronaut is dead');
      return;
    }
    if (this.movementMode === 'ground') {
      // Ground movement: vertical motion is strictly jet-assisted jump (thrust); direct vertical velocity override ignored
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
    if (this.movementMode === 'ground') {
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
    this.worldX = x;
    this.velocity = 0;
    this.horizontalVelocity = 0;
    this.rotation = 0;
    this.dead = false;
    this.isGrounded = false;
    this.sprite.tint = 0xFFFFFF;
    this.sprite.rotation = 0;
    this.sprite.alpha = 1;
    this.thrustRemaining = 0;
    this.deathElapsed = 0;
    this.rechargeThrust();

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
