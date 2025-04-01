import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT } from '../config';

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
  }

  update(deltaMS: number = 16.667) {
    if (this.dead) return;

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
    }
    
    if (this.sprite.y + this.sprite.height/2 > GAME_HEIGHT) {
      this.sprite.y = GAME_HEIGHT - this.sprite.height/2;
      this.velocity = 0;
      this.die();
    }
  }

  flap() {
    if (this.dead) return;
    this.velocity = JUMP_VELOCITY;
  }

  die() {
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