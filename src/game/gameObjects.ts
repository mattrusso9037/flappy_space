import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT, GAME_WIDTH, COLORS } from './config';

// Helper function to check if two rectangles overlap
function rectanglesIntersect(r1: PIXI.Bounds, r2: PIXI.Bounds): boolean {
  return !(
    r1.maxX < r2.minX ||
    r1.minX > r2.maxX ||
    r1.maxY < r2.minY ||
    r1.minY > r2.maxY
  );
}

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

export class Obstacle {
  topPipe: PIXI.Graphics;
  bottomPipe: PIXI.Graphics;
  passed: boolean;
  speed: number;

  constructor(x: number, gapY: number, gapHeight: number, width: number, speed: number) {
    // Top pipe
    this.topPipe = new PIXI.Graphics();
    this.topPipe.fill({ color: COLORS.obstacle });
    this.topPipe.rect(0, 0, width, gapY);
    this.topPipe.x = x;
    this.topPipe.y = 0;

    // Bottom pipe
    this.bottomPipe = new PIXI.Graphics();
    this.bottomPipe.fill({ color: COLORS.obstacle });
    this.bottomPipe.rect(0, 0, width, GAME_HEIGHT - gapY - gapHeight);
    this.bottomPipe.x = x;
    this.bottomPipe.y = gapY + gapHeight;

    this.passed = false;
    this.speed = speed;
  }

  update() {
    this.topPipe.x -= this.speed;
    this.bottomPipe.x -= this.speed;
  }

  isOffScreen(): boolean {
    return this.topPipe.x + this.topPipe.width < 0;
  }

  checkCollision(astronaut: Astronaut): boolean {
    if (astronaut.dead) return false;

    const astronautBounds = astronaut.sprite.getBounds();
    const topPipeBounds = this.topPipe.getBounds();
    const bottomPipeBounds = this.bottomPipe.getBounds();

    return (
      rectanglesIntersect(astronautBounds, topPipeBounds) || 
      rectanglesIntersect(astronautBounds, bottomPipeBounds)
    );
  }

  isPassed(astronautX: number): boolean {
    if (this.passed) return false;
    
    if (this.topPipe.x + this.topPipe.width < astronautX) {
      this.passed = true;
      return true;
    }
    
    return false;
  }
}

export class Star {
  graphics: PIXI.Graphics;
  blinkSpeed: number;
  blinkDirection: number;
  alpha: number;
  speed: number;
  size: number;
  layer: number; // 0 = background, 1 = middle, 2 = foreground

  constructor(x: number, y: number, size: number, alpha: number, layer: number = 0) {
    this.size = size;
    this.layer = layer;
    
    // Set speed based on the layer (parallax effect)
    const layerSpeeds = [0.1, 0.3, 0.8]; // Background, middle, foreground speeds
    this.speed = layerSpeeds[layer] || 0.1;
    
    this.graphics = new PIXI.Graphics();
    
    // Adjust color slightly based on layer for depth perception
    let color;
    if (layer === 0) {
      color = 0x6666AA; // Distant stars (slightly purple)
    } else if (layer === 1) {
      color = 0xAAAAAA; // Middle stars (grey-white)
    } else {
      color = 0xFFFFFF; // Close stars (bright white)
    }
    
    this.graphics.circle(0, 0, size);
    this.graphics.fill({ color, alpha: alpha });
    this.graphics.x = x;
    this.graphics.y = y;
    
    this.blinkSpeed = 0.005 * Math.random();
    this.blinkDirection = Math.random() > 0.5 ? 1 : -1;
    this.alpha = alpha;
  }

  update() {
    // Move the star horizontally based on its speed (parallax)
    this.graphics.x -= this.speed;
    
    // Reset position when star goes off screen
    if (this.graphics.x + this.size < 0) {
      this.graphics.x = GAME_WIDTH + this.size;
      this.graphics.y = Math.random() * GAME_HEIGHT;
    }
    
    // Handle blinking effect
    this.alpha += this.blinkSpeed * this.blinkDirection;
    
    if (this.alpha > 1) {
      this.alpha = 1;
      this.blinkDirection = -1;
    } else if (this.alpha < 0.2) {
      this.alpha = 0.2;
      this.blinkDirection = 1;
    }
    
    this.graphics.alpha = this.alpha;
  }
} 