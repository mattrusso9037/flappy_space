import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT } from '../config';
import { eventBus, GameEvent } from '../eventBus';

export class Astronaut {
  sprite: PIXI.Sprite;
  velocity: number;
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
      console.log('Astronaut: Received JUMP_ACTION event from EventBus');
      this.flap();
    });

    console.log('Astronaut: Created and subscribed to JUMP_ACTION events');
  }

  update(deltaMS: number = 16.667) {
    if (this.dead) return;

    // Occasionally log position for debugging
    if (Math.random() < 0.01) {
      console.log(`Astronaut: Position (${this.sprite.x}, ${this.sprite.y}), Velocity: ${this.velocity}`);
    }

    // Scale delta time to make physics consistent
    const delta = deltaMS / 16.667; // Normalize to a 60 FPS time step

    // Apply gravity with deltaTime scaling
    this.velocity += GRAVITY * delta;
    if (this.velocity > MAX_VELOCITY) {
      this.velocity = MAX_VELOCITY;
    }

    // Update position, scaled by delta time
    this.sprite.y += this.velocity * delta;

    // Update rotation based on velocity
    const targetRotation = (this.velocity / MAX_VELOCITY) * Math.PI / 6; // 30 degrees max
    this.rotation = this.rotation * 0.9 + targetRotation * 0.1;
    this.sprite.rotation = this.rotation;

    // Check boundaries - don't let the astronaut go off screen
    if (this.sprite.y - this.sprite.height/2 < 0) {
      this.sprite.y = this.sprite.height/2;
      this.velocity = 0;
      console.log('Astronaut: Hit top boundary');
    }
    
    if (this.sprite.y + this.sprite.height/2 > GAME_HEIGHT) {
      this.sprite.y = GAME_HEIGHT - this.sprite.height/2;
      this.velocity = 0;
      console.log('Astronaut: Hit bottom boundary - dying');
      this.die();
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
      console.log('Astronaut: Flap attempted but astronaut is dead');
      return;
    }
    console.log(`Astronaut: Flap! Setting velocity from ${this.velocity} to ${JUMP_VELOCITY}`);
    this.velocity = JUMP_VELOCITY;
  }

  die() {
    console.log('Astronaut: Dying...');
    this.dead = true;
    this.sprite.tint = 0xFF5555;
  }

  reset(x: number, y: number) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.velocity = 0;
    this.rotation = 0;
    this.dead = false;
    this.sprite.tint = 0xFFFFFF;
  }
} 