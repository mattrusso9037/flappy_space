import * as PIXI from 'pixi.js';
import { Astronaut } from '../entities/Astronaut';
import { Obstacle } from '../entities/Obstacle';
import { Planet } from '../entities/Planet';
import { Orb } from '../entities/Orb';
import { Star } from '../entities/Star';
import { ASTRONAUT, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { eventBus, GameEvent } from '../eventBus';
import assetManager from '../assetManager';

/**
 * EntityManager manages all game entities and their lifecycle.
 */
export class EntityManager {
  private static instance: EntityManager;
  
  private app: PIXI.Application | null = null;
  private astronaut: Astronaut | null = null;
  private obstacles: Obstacle[] = [];
  private orbs: Orb[] = [];
  private stars: Star[] = [];
  private initialized: boolean = false;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): EntityManager {
    if (!EntityManager.instance) {
      EntityManager.instance = new EntityManager();
    }
    return EntityManager.instance;
  }
  
  /**
   * Initialize the EntityManager with the PIXI application
   */
  public initialize(app?: PIXI.Application): void {
    if (this.initialized) return;
    
    if (app) {
      this.app = app;
    }
    
    this.initialized = true;
    console.log('EntityManager initialized');
  }
  
  /**
   * Clear all entities from the manager and stage
   */
  public clearAll(): void {
    if (!this.app) return;
    
    // Clear astronaut
    if (this.astronaut) {
      this.app.stage.removeChild(this.astronaut.sprite);
      this.astronaut = null;
    }
    
    // Clear obstacles
    this.clearObstacles();
    
    // Clear orbs
    this.clearOrbs();
    
    // Clear stars
    this.clearStars();
    
    console.log('All entities cleared');
  }
  
  /**
   * Create the astronaut entity
   */
  public createAstronaut(): Astronaut | null {
    if (!this.app) return null;
    
    console.log('EntityManager: Creating astronaut entity');
    
    const astronautTexture = assetManager.getTexture('astronaut');
    this.astronaut = new Astronaut(
      astronautTexture,
      ASTRONAUT.startX,
      ASTRONAUT.startY
    );
    
    this.app.stage.addChild(this.astronaut.sprite);
    
    console.log(`EntityManager: Astronaut created at position (${ASTRONAUT.startX}, ${ASTRONAUT.startY})`);
    
    // Emit entity created event
    eventBus.emit(GameEvent.ENTITY_CREATED, {
      type: 'astronaut',
      entity: this.astronaut
    });
    
    return this.astronaut;
  }
  
  /**
   * Create a planet obstacle
   */
  public createPlanet(x: number, y: number, radius: number, speed: number): Planet {
    if (!this.app) throw new Error('App not initialized in EntityManager');
    
    console.log(`EntityManager: Creating planet at (${x}, ${y}) with radius ${radius}`);
    
    const planet = new Planet(x, y, radius, speed);
    
    // Add to stage (both graphics and glow)
    this.app.stage.addChild(planet.glowGraphics);
    this.app.stage.addChild(planet.graphics);
    
    // Add to obstacles array
    this.obstacles.push(planet);
    
    console.log(`EntityManager: Total obstacles now: ${this.obstacles.length}`);
    
    // Emit entity created event
    eventBus.emit(GameEvent.ENTITY_CREATED, {
      type: 'planet',
      entity: planet
    });
    
    return planet;
  }
  
  /**
   * Create an orb entity
   */
  public createOrb(x: number, y: number, radius: number, speed: number): Orb {
    if (!this.app) throw new Error('App not initialized in EntityManager');
    
    console.log(`EntityManager: Creating orb at (${x}, ${y}) with radius ${radius}`);
    
    const orb = new Orb(x, y, radius, speed);
    
    // Add to stage (both graphics and glow)
    this.app.stage.addChild(orb.glowGraphics);
    this.app.stage.addChild(orb.graphics);
    
    // Add to orbs array
    this.orbs.push(orb);
    
    console.log(`EntityManager: Total orbs now: ${this.orbs.length}`);
    
    // Emit entity created event
    eventBus.emit(GameEvent.ENTITY_CREATED, {
      type: 'orb',
      entity: orb
    });
    
    return orb;
  }
  
  /**
   * Create a background star
   */
  public createStar(x: number, y: number, size: number, alpha: number, layer: number): Star {
    if (!this.app) throw new Error('App not initialized in EntityManager');
    
    const star = new Star(x, y, size, alpha, layer);
    
    // Add to stage
    this.app.stage.addChild(star.graphics);
    
    // Add to stars array
    this.stars.push(star);
    
    return star;
  }
  
  /**
   * Create the background starfield
   */
  public createBackground(): void {
    if (!this.app) return;
    
    // Clear existing stars first
    this.clearStars();
    
    // Create distant stars (small, slow-moving)
    for (let i = 0; i < 80; i++) {
      this.createStar(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 1 + 0.5,
        Math.random() * 0.5 + 0.2,
        0
      );
    }
    
    // Create mid-distance stars (medium size)
    for (let i = 0; i < 40; i++) {
      this.createStar(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 1.5 + 1,
        Math.random() * 0.6 + 0.3,
        1
      );
    }
    
    // Create close stars (large, fast-moving)
    for (let i = 0; i < 20; i++) {
      this.createStar(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() * 2 + 1.5,
        Math.random() * 0.7 + 0.4,
        2
      );
    }
  }
  
  /**
   * Remove an obstacle from the stage and manager
   */
  public removeObstacle(obstacle: Obstacle): void {
    if (!this.app) return;
    
    const index = this.obstacles.indexOf(obstacle);
    if (index === -1) return;
    
    // Remove from display
    if ('graphics' in obstacle) {
      this.app.stage.removeChild((obstacle as any).graphics);
      if ('glowGraphics' in obstacle) {
        this.app.stage.removeChild((obstacle as any).glowGraphics);
      }
    } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
      this.app.stage.removeChild((obstacle as any).topPipe);
      this.app.stage.removeChild((obstacle as any).bottomPipe);
    }
    
    // Remove from array
    this.obstacles.splice(index, 1);
    
    // Emit entity destroyed event
    eventBus.emit(GameEvent.ENTITY_DESTROYED, {
      type: 'obstacle',
      entity: obstacle
    });
  }
  
  /**
   * Remove an orb from the stage and manager
   */
  public removeOrb(orb: Orb): void {
    if (!this.app) return;
    
    const index = this.orbs.indexOf(orb);
    if (index === -1) return;
    
    // Remove from display
    this.app.stage.removeChild(orb.graphics);
    this.app.stage.removeChild(orb.glowGraphics);
    
    // Remove from array
    this.orbs.splice(index, 1);
    
    // Emit entity destroyed event
    eventBus.emit(GameEvent.ENTITY_DESTROYED, {
      type: 'orb',
      entity: orb
    });
  }
  
  /**
   * Clear all obstacles
   */
  private clearObstacles(): void {
    if (!this.app) return;
    
    this.obstacles.forEach(obstacle => {
      if ('graphics' in obstacle) {
        this.app.stage.removeChild((obstacle as any).graphics);
        if ('glowGraphics' in obstacle) {
          this.app.stage.removeChild((obstacle as any).glowGraphics);
        }
      } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
        this.app.stage.removeChild((obstacle as any).topPipe);
        this.app.stage.removeChild((obstacle as any).bottomPipe);
      }
    });
    
    this.obstacles = [];
  }
  
  /**
   * Clear all orbs
   */
  private clearOrbs(): void {
    if (!this.app) return;
    
    this.orbs.forEach(orb => {
      this.app.stage.removeChild(orb.graphics);
      this.app.stage.removeChild(orb.glowGraphics);
    });
    
    this.orbs = [];
  }
  
  /**
   * Clear all stars
   */
  private clearStars(): void {
    if (!this.app) return;
    
    this.stars.forEach(star => {
      this.app.stage.removeChild(star.graphics);
    });
    
    this.stars = [];
  }
  
  /**
   * Get the astronaut entity
   */
  public getAstronaut(): Astronaut | null {
    return this.astronaut;
  }
  
  /**
   * Get all obstacles
   */
  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }
  
  /**
   * Get all orbs
   */
  public getOrbs(): Orb[] {
    return this.orbs;
  }
  
  /**
   * Get all stars
   */
  public getStars(): Star[] {
    return this.stars;
  }
  
  /**
   * Get all game entities as a single array
   */
  public getAllEntities(): any[] {
    // Debug this method occasionally
    if (Math.random() < 0.01) {
      console.log(`EntityManager.getAllEntities: Astronaut: ${this.astronaut ? 'present' : 'null'}, Obstacles: ${this.obstacles.length}, Orbs: ${this.orbs.length}, Stars: ${this.stars.length}`); 
    }
    
    const allEntities = [...this.obstacles, ...this.orbs, ...this.stars];
    if (this.astronaut) {
      allEntities.unshift(this.astronaut); // Place astronaut first in array
    }
    
    return allEntities;
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    this.clearAll();
    this.initialized = false;
    console.log('EntityManager disposed');
  }
}

// Export a default instance for convenient imports
export const entityManager = EntityManager.getInstance(); 