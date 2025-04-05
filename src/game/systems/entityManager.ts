import * as PIXI from 'pixi.js';
import { Astronaut } from '../entities/Astronaut';
import { Obstacle } from '../entities/Obstacle';
import { Planet } from '../entities/Planet';
import { Orb } from '../entities/Orb';
import { Star } from '../entities/Star';
import { ASTRONAUT, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { eventBus, GameEvent } from '../eventBus';
import assetManager from '../assetManager';
import{ getLogger } from '../../utils/logger';

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
  private logger = getLogger('EntityManager');
  
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
    this.logger.info('EntityManager initialized');
  }
  
  /**
   * Clear all entities from the manager and stage
   */
  public clearAll(): void {
    if (!this.app) return;
    
    console.log('EntityManager: Clearing all entities');
    
    // Clear astronaut
    if (this.astronaut) {
      this.logger.info('Removing astronaut from stage');
      // Ensure the sprite exists before removing/destroying
      if (this.astronaut.sprite && this.app.stage.children.includes(this.astronaut.sprite)) {
         this.app.stage.removeChild(this.astronaut.sprite);
      }
      // Ensure astronaut resources are freed
      this.astronaut.sprite?.destroy(); // Destroy the sprite if it exists
      this.astronaut = null;
      this.logger.info('Astronaut reference cleared');
    } else {
      console.log('EntityManager: No astronaut to clear');
    }
    
    // Clear obstacles
    this.clearObstacles();
    
    // Clear orbs
    this.clearOrbs();
    
    // Clear stars
    this.clearStars();
    
    console.log('EntityManager: All entities cleared');
  }
  
  /**
   * Create the astronaut entity
   */
  public createAstronaut(): Astronaut | null {
    if (!this.app) {
      console.error('EntityManager: Cannot create astronaut - app is null');
      return null;
    }
    
    // First check if astronaut already exists and remove it if it does
    if (this.astronaut && this.astronaut.sprite) {
      console.log('EntityManager: Astronaut already exists, removing old instance');
      this.app.stage.removeChild(this.astronaut.sprite);
      this.astronaut = null;
    }
    
    console.log('EntityManager: Creating new astronaut entity');
    
    const astronautTexture = assetManager.getTexture('astronaut');
    if (!astronautTexture) {
      console.error('EntityManager: Failed to get astronaut texture');
      return null;
    }
    
    // Create new astronaut at the starting position
    this.astronaut = new Astronaut(
      astronautTexture,
      ASTRONAUT.startX,
      ASTRONAUT.startY
    );
    
    if (!this.astronaut || !this.astronaut.sprite) {
      console.error('EntityManager: Failed to create astronaut');
      return null;
    }
    
    // Add to stage
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
    this.logger.debug('EntityManager: Creating background starfield2');
    
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
    if (!this.app || !this.app.stage) return; // Added stage check

        const index = this.obstacles.indexOf(obstacle);
        if (index === -1) return;

        // Remove from display and destroy
        if ('graphics' in obstacle && (obstacle as any).graphics instanceof PIXI.Graphics) {
           const graphics = (obstacle as any).graphics;
           if (this.app.stage.children.includes(graphics)) {
             this.app.stage.removeChild(graphics);
           }
           graphics.destroy(); // Destroy graphics
          if ('glowGraphics' in obstacle && (obstacle as any).glowGraphics instanceof PIXI.Graphics) {
             const glowGraphics = (obstacle as any).glowGraphics;
            if (this.app.stage.children.includes(glowGraphics)) {
              this.app.stage.removeChild(glowGraphics);
            }
            glowGraphics.destroy(); // Destroy glow graphics
          }
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
    if (!this.app || !this.app.stage) return; // Added stage check

        const index = this.orbs.indexOf(orb);
        if (index === -1) return;

        // Remove from display and destroy
        if (orb.graphics instanceof PIXI.Graphics) {
           if (this.app.stage.children.includes(orb.graphics)) {
             this.app.stage.removeChild(orb.graphics);
           }
          orb.graphics.destroy(); // Destroy graphics
        }
         if (orb.glowGraphics instanceof PIXI.Graphics) {
           if (this.app.stage.children.includes(orb.glowGraphics)) {
             this.app.stage.removeChild(orb.glowGraphics);
           }
          orb.glowGraphics.destroy(); // Destroy glow graphics
        }


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
    if (!this.app || !this.app.stage) return; // Added stage check for safety

    this.logger.debug(`Clearing ${this.obstacles.length} obstacles`);
    this.obstacles.forEach(obstacle => {
      // Remove from stage and destroy graphics/sprites
      if ('graphics' in obstacle && (obstacle as any).graphics instanceof PIXI.Graphics) {
        const graphics = (obstacle as any).graphics;
        if (this.app?.stage.children.includes(graphics)) {
            this.app.stage.removeChild(graphics);
        }
        graphics.destroy(); // Destroy graphics

        if ('glowGraphics' in obstacle && (obstacle as any).glowGraphics instanceof PIXI.Graphics) {
          const glowGraphics = (obstacle as any).glowGraphics;
           if (this.app?.stage.children.includes(glowGraphics)) {
             this.app.stage.removeChild(glowGraphics);
           }
          glowGraphics.destroy(); // Destroy glow graphics
        }
      }
    });

    this.obstacles = [];
    this.logger.debug('Obstacles cleared');
  }
  
  /**
   * Clear all orbs
   */
  private clearOrbs(): void {
    if (!this.app || !this.app.stage) return; // Added stage check

    this.logger.debug(`Clearing ${this.orbs.length} orbs`);
    this.orbs.forEach(orb => {
      if (orb.graphics instanceof PIXI.Graphics) {
        if (this.app?.stage.children.includes(orb.graphics)) {
          this.app.stage.removeChild(orb.graphics);
        }
        orb.graphics.destroy(); // Destroy graphics
      }
      if (orb.glowGraphics instanceof PIXI.Graphics) {
         if (this.app?.stage.children.includes(orb.glowGraphics)) {
           this.app.stage.removeChild(orb.glowGraphics);
         }
        orb.glowGraphics.destroy(); // Destroy glow graphics
      }
    });

    this.orbs = [];
    this.logger.debug('Orbs cleared');
  }
  
  /**
   * Clear all stars
   */
  private clearStars(): void {
    if (!this.app || !this.app.stage) return; // Added stage check

        this.logger.debug(`Clearing ${this.stars.length} stars`);
        this.stars.forEach(star => {
          if (star.graphics instanceof PIXI.Graphics) {
             if (this.app?.stage.children.includes(star.graphics)) {
               this.app.stage.removeChild(star.graphics);
             }
            star.graphics.destroy(); // Destroy graphics
          }
        });

        this.stars = [];
        this.logger.debug('Stars cleared');
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
    
    const allEntities: (Obstacle | Star | Astronaut)[] = [...this.obstacles, ...this.orbs, ...this.stars];
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