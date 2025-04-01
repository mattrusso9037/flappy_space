import * as PIXI from 'pixi.js';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';

// Abstract base class for all obstacles
export abstract class Obstacle {
  passed: boolean;
  speed: number;
  x: number;
  y: number;

  constructor(x: number, speed: number) {
    this.x = x;
    this.y = 0; // Will be set by subclasses
    this.passed = false;
    this.speed = speed;
  }

  abstract update(): void;
  abstract isOffScreen(): boolean;
  abstract checkCollision(astronaut: Astronaut): boolean;

  isPassed(astronautX: number): boolean {
    if (this.passed) return false;
    
    if (this.x < astronautX) {
      this.passed = true;
      return true;
    }
    
    return false;
  }
}

// Legacy pipe-style obstacle, kept for reference
export class PipeObstacle extends Obstacle {
  topPipe: PIXI.Graphics;
  bottomPipe: PIXI.Graphics;

  constructor(x: number, gapY: number, gapHeight: number, width: number, speed: number) {
    super(x, speed);

    // Import GAME_HEIGHT and COLORS here to avoid circular dependencies
    const GAME_HEIGHT = import.meta.env.VITE_GAME_HEIGHT || 600;
    const OBSTACLE_COLOR = 0x4444FF;
    
    // Top pipe
    this.topPipe = new PIXI.Graphics();
    this.topPipe.rect(0, 0, width, gapY);
    this.topPipe.fill({ color: OBSTACLE_COLOR });
    this.topPipe.x = x;
    this.topPipe.y = 0;

    // Bottom pipe
    this.bottomPipe = new PIXI.Graphics();
    this.bottomPipe.rect(0, 0, width, GAME_HEIGHT - gapY - gapHeight);
    this.bottomPipe.fill({ color: OBSTACLE_COLOR });
    this.bottomPipe.x = x;
    this.bottomPipe.y = gapY + gapHeight;
  }

  update() {
    this.x -= this.speed;
    this.topPipe.x = this.x;
    this.bottomPipe.x = this.x;
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
} 