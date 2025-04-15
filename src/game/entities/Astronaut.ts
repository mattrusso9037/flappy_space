import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { eventBus, GameEvent } from '../eventBus';
import { getLogger } from '../../utils/logger';

const logger = getLogger('Astronaut');

// New constants for horizontal movement
const HORIZONTAL_SPEED = 5;
const VERTICAL_SPEED = 5;

export class Astronaut {
  sprite: PIXI.Sprite;
  velocity: number;
  horizontalVelocity: number = 0;
  rotation: number;
  dead: boolean;
  
  // Simplified properties - no animation frames for now
  // We'll implement proper animation in a future update if the sprite sheet is provided
  
  constructor(texture: PIXI.Texture, x: number, y: number) {
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.width = 50;
    this.sprite.height = 50;
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.anchor.set(0.5);
    
    this.velocity = 0;
    this.rotation = 0;
    this.dead = false;
    
    // Subscribe to the JUMP_ACTION event
    eventBus.on(GameEvent.JUMP_ACTION).subscribe(() => {
      logger.debug('Received JUMP_ACTION event from EventBus');
      this.flap();
    });

    // Subscribe to new movement events
    eventBus.on(GameEvent.MOVE_LEFT_ACTION).subscribe(() => {
      logger.debug('Received MOVE_LEFT_ACTION event from EventBus');
      this.moveLeft();
    });

    eventBus.on(GameEvent.MOVE_RIGHT_ACTION).subscribe(() => {
      logger.debug('Received MOVE_RIGHT_ACTION event from EventBus');
      this.moveRight();
    });

    eventBus.on(GameEvent.MOVE_UP_ACTION).subscribe(() => {
      logger.debug('Received MOVE_UP_ACTION event from EventBus');
      this.moveUp();
    });

    eventBus.on(GameEvent.MOVE_DOWN_ACTION).subscribe(() => {
      logger.debug('Received MOVE_DOWN_ACTION event from EventBus');
      this.moveDown();
    });

    logger.info('Created and subscribed to input events');
  }

  update(deltaMS: number = 16.667) {
    if (this.dead) return;

    // Occasionally log position for debugging
    if (Math.random() < 0.01) {
      logger.debug(`Position (${this.sprite.x}, ${this.sprite.y}), Velocity: ${this.velocity}, HVelocity: ${this.horizontalVelocity}`);
    }

    // Scale delta time to make physics consistent
    const delta = deltaMS / 16.667; // Normalize to a 60 FPS time step

    // Apply gravity with deltaTime scaling (only if we're keeping the flapping mechanic)
    this.velocity += GRAVITY * delta;
    if (this.velocity > MAX_VELOCITY) {
      this.velocity = MAX_VELOCITY;
    }

    // Update position, scaled by delta time
    this.sprite.y += this.velocity * delta;
    this.sprite.x += this.horizontalVelocity * delta;
    
    // Apply horizontal deceleration (friction)
    if (this.horizontalVelocity > 0) {
      this.horizontalVelocity = Math.max(0, this.horizontalVelocity - 0.1 * delta);
    } else if (this.horizontalVelocity < 0) {
      this.horizontalVelocity = Math.min(0, this.horizontalVelocity + 0.1 * delta);
    }

    // Update rotation based on velocity
    const targetRotation = (this.velocity / MAX_VELOCITY) * Math.PI / 6; // 30 degrees max
    this.rotation = this.rotation * 0.9 + targetRotation * 0.1;
    this.sprite.rotation = this.rotation;

    // Check boundaries - don't let the astronaut go off screen
    if (this.sprite.y - this.sprite.height/2 < 0) {
      this.sprite.y = this.sprite.height/2;
      this.velocity = 0;
      logger.info('Hit top boundary');
    }
    
    if (this.sprite.y + this.sprite.height/2 > GAME_HEIGHT) {
      this.sprite.y = GAME_HEIGHT - this.sprite.height/2;
      this.velocity = 0;
      logger.info('Hit bottom boundary - dying');
      this.die();
    }
    
    // Check left/right boundaries
    if (this.sprite.x - this.sprite.width/2 < 0) {
      this.sprite.x = this.sprite.width/2;
      this.horizontalVelocity = 0;
      logger.info('Hit left boundary');
    }
    
    if (this.sprite.x + this.sprite.width/2 > GAME_WIDTH) {
      this.sprite.x = GAME_WIDTH - this.sprite.width/2;
      this.horizontalVelocity = 0;
      logger.info('Hit right boundary');
    }
  }

  // Get a more accurate hitbox for collision detection
  // The hitbox is smaller than the sprite to match the visual appearance better
  getHitbox(): PIXI.Bounds {
    // Create a custom bounds object
    const bounds = new PIXI.Bounds();
    
    // Make the hitbox 70% of the sprite size for better collision accuracy
    const hitboxScale = 0.7;
    const width = this.sprite.width * hitboxScale;
    const height = this.sprite.height * hitboxScale;
    
    // Calculate bounds based on the sprite's center position
    bounds.minX = this.sprite.x - width / 2;
    bounds.maxX = this.sprite.x + width / 2;
    bounds.minY = this.sprite.y - height / 2;
    bounds.maxY = this.sprite.y + height / 2;
    
    return bounds;
  }

  flap() {
    if (this.dead) {
      logger.debug('Flap attempted but astronaut is dead');
      return;
    }
    logger.debug(`Flap! Setting velocity from ${this.velocity} to ${JUMP_VELOCITY}`);
    this.velocity = JUMP_VELOCITY;
  }
  
  moveLeft() {
    if (this.dead) {
      logger.debug('Move left attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move left! Setting horizontal velocity to -${HORIZONTAL_SPEED}`);
    this.horizontalVelocity = -HORIZONTAL_SPEED;
  }
  
  moveRight() {
    if (this.dead) {
      logger.debug('Move right attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move right! Setting horizontal velocity to ${HORIZONTAL_SPEED}`);
    this.horizontalVelocity = HORIZONTAL_SPEED;
  }
  
  moveUp() {
    if (this.dead) {
      logger.debug('Move up attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move up! Setting vertical velocity to -${VERTICAL_SPEED}`);
    this.velocity = -VERTICAL_SPEED;
  }
  
  moveDown() {
    if (this.dead) {
      logger.debug('Move down attempted but astronaut is dead');
      return;
    }
    logger.debug(`Move down! Setting vertical velocity to ${VERTICAL_SPEED}`);
    this.velocity = VERTICAL_SPEED;
  }

  die() {
    logger.info('Dying...');
    this.dead = true;
    this.sprite.tint = 0xFF5555;
  }

  reset(x: number, y: number) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.velocity = 0;
    this.horizontalVelocity = 0;
    this.rotation = 0;
    this.dead = false;
    this.sprite.tint = 0xFFFFFF;
  }
} 