import * as PIXI from 'pixi.js';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';
import { getLogger } from '../../utils/logger';

const logger = getLogger('Obstacle');

// Abstract base class for all obstacles
export abstract class Obstacle {
  passed: boolean;
  speed: number;
  initialSpeed: number; // Store the initial speed for tracking
  x: number;
  y: number;
  id: string; // Unique identifier for tracking
  createdAt: number; // Creation timestamp
  speedHistory: Array<{time: number, speed: number}>; // To track speed changes over time
  lastUpdateTime: number; // Last update timestamp
  
  // Speed tracking settings
  private static trackSpeedEnabled: boolean = true;
  private static speedLoggingInterval: number = 2000; // Log speed every 2 seconds
  private static nextLogId: number = 1; // For generating unique IDs
  
  constructor(x: number, speed: number) {
    this.x = x;
    this.y = 0; // Will be set by subclasses
    this.passed = false;
    this.speed = speed;
    this.initialSpeed = speed;
    this.createdAt = performance.now();
    this.id = `obstacle_${Obstacle.nextLogId++}`;
    this.speedHistory = [{time: this.createdAt, speed: speed}];
    this.lastUpdateTime = this.createdAt;
    
    logger.debug(`Created ${this.id} with initial speed: ${this.speed}`);
  }
  
  // Enable/disable speed tracking globally
  public static enableSpeedTracking(enabled: boolean): void {
    Obstacle.trackSpeedEnabled = enabled;
    logger.info(`Speed tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Set how often to log speed data
  public static setSpeedLoggingInterval(ms: number): void {
    Obstacle.speedLoggingInterval = ms;
    logger.info(`Speed logging interval set to ${ms}ms`);
  }
  
  // Method to track speed changes, called during update
  protected trackSpeed(): void {
    if (!Obstacle.trackSpeedEnabled) return;
    
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    const timeSinceCreation = now - this.createdAt;
    
    // Add to history if speed has changed
    if (this.speed !== this.speedHistory[this.speedHistory.length - 1].speed) {
      this.speedHistory.push({time: now, speed: this.speed});
      logger.debug(`${this.id} speed changed to ${this.speed} (was ${this.speedHistory[this.speedHistory.length - 2].speed})`);
    }
    
    // Log periodically if more than speedLoggingInterval ms has passed since last log
    if (timeSinceLastUpdate >= Obstacle.speedLoggingInterval) {
      // Calculate speed ratios
      const initialSpeedRatio = this.speed / this.initialSpeed;
      
      logger.info(
        `${this.id} | Age: ${Math.round(timeSinceCreation)}ms | ` +
        `Current speed: ${this.speed.toFixed(4)} | Initial speed: ${this.initialSpeed.toFixed(4)} | ` +
        `Ratio: ${initialSpeedRatio.toFixed(4)} | ` +
        `Position: (${Math.round(this.x)}, ${Math.round(this.y)})`
      );
      
      this.lastUpdateTime = now;
    }
  }
  
  abstract update(deltaTime?: number): void;
  abstract isOffScreen(): boolean;
  abstract checkCollision(astronaut: Astronaut): boolean;
  
  // Helper method to get speed stats
  public getSpeedStats(): {
    id: string,
    initialSpeed: number,
    currentSpeed: number,
    ratio: number,
    history: Array<{time: number, speed: number}>
  } {
    return {
      id: this.id,
      initialSpeed: this.initialSpeed,
      currentSpeed: this.speed,
      ratio: this.speed / this.initialSpeed,
      history: this.speedHistory
    };
  }

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