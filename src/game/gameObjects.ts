import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_VELOCITY, MAX_VELOCITY, GAME_HEIGHT, COLORS } from './config';

export class Astronaut {
  sprite: PIXI.Sprite;
  velocity: number;
  rotation: number;
  dead: boolean;

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

  update() {
    if (this.dead) return;

    // Apply gravity
    this.velocity += GRAVITY;
    if (this.velocity > MAX_VELOCITY) {
      this.velocity = MAX_VELOCITY;
    }

    // Update position
    this.sprite.y += this.velocity;

    // Update rotation based on velocity
    const targetRotation = (this.velocity / MAX_VELOCITY) * Math.PI / 4; // 45 degrees max
    this.rotation = this.rotation * 0.9 + targetRotation * 0.1;
    this.sprite.rotation = this.rotation;

    // Check boundaries
    if (this.sprite.y < 0) {
      this.sprite.y = 0;
      this.velocity = 0;
    }
    
    if (this.sprite.y > GAME_HEIGHT) {
      this.sprite.y = GAME_HEIGHT;
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
    this.topPipe.beginFill(COLORS.obstacle);
    this.topPipe.drawRect(0, 0, width, gapY);
    this.topPipe.endFill();
    this.topPipe.x = x;
    this.topPipe.y = 0;

    // Bottom pipe
    this.bottomPipe = new PIXI.Graphics();
    this.bottomPipe.beginFill(COLORS.obstacle);
    this.bottomPipe.drawRect(0, 0, width, GAME_HEIGHT - gapY - gapHeight);
    this.bottomPipe.endFill();
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
      astronautBounds.intersects(topPipeBounds) || 
      astronautBounds.intersects(bottomPipeBounds)
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

  constructor(x: number, y: number, size: number, alpha: number, blinkSpeed: number = 0.01) {
    this.graphics = new PIXI.Graphics();
    this.graphics.beginFill(COLORS.stars, alpha);
    this.graphics.drawCircle(0, 0, size);
    this.graphics.endFill();
    this.graphics.x = x;
    this.graphics.y = y;
    
    this.blinkSpeed = blinkSpeed * Math.random();
    this.blinkDirection = Math.random() > 0.5 ? 1 : -1;
    this.alpha = alpha;
  }

  update() {
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