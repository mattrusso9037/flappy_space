import * as PIXI from 'pixi.js';
import { GAME_HEIGHT, COLORS } from '../config';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';

export class Obstacle {
  topPipe: PIXI.Graphics;
  bottomPipe: PIXI.Graphics;
  passed: boolean;
  speed: number;

  constructor(x: number, gapY: number, gapHeight: number, width: number, speed: number) {
    // Top pipe
    this.topPipe = new PIXI.Graphics();
    this.topPipe.rect(0, 0, width, gapY);
    this.topPipe.fill({ color: COLORS.obstacle });
    this.topPipe.x = x;
    this.topPipe.y = 0;

    // Bottom pipe
    this.bottomPipe = new PIXI.Graphics();
    this.bottomPipe.rect(0, 0, width, GAME_HEIGHT - gapY - gapHeight);
    this.bottomPipe.fill({ color: COLORS.obstacle });
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