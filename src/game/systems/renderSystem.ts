import * as PIXI from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { GameStateService } from '../gameStateService';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * RenderSystem manages all rendering operations for the game.
 */
export class RenderSystem {
  private app: PIXI.Application | null = null;
  private debugGraphics: PIXI.Graphics | null = null;
  private initialized: boolean = false;
  private readonly entities: EntitySystem;
  private readonly state: GameStateService;
  
  public constructor(
    app: PIXI.Application | null,
    entities: EntitySystem,
    state: GameStateService
  ) {
    this.app = app ?? null;
    this.entities = entities;
    this.state = state;
  }
  
  /**
   * Initialize the RenderSystem with the PIXI application
   */
  public initialize(app?: PIXI.Application): void {
    if (this.initialized) return;
    
    if (app) {
      this.app = app;
    }
    
    if (this.app) {
      // Set up debug graphics
      this.debugGraphics = new PIXI.Graphics();
      this.app.stage.addChild(this.debugGraphics);
    }
    
    this.initialized = true;
  }
  
  /**
   * Update the render system (called every frame)
   */
  public update(_deltaTime?: number, _entities?: unknown[]): void {
    if (!this.initialized || !this.app) return;
  
    
    // Render debug information if enabled
    this.renderDebugInfo();
  }
  
  /**
   * Create the background with stars
   */
  public createBackground(): void {
    if (!this.initialized) return;
    
    this.entities.createBackground();
  }
  
  /**
   * Update background elements like stars even when game isn't officially started
   */
  public updateBackground(deltaTime: number): void {
    if (!this.initialized) return;
    
    // Get all stars and update their positions
    const stars = this.entities.getStars();
    if (stars.length > 0) {
      // Update star positions with controlled deltaTime to prevent speed inconsistencies
      // Limit deltaTime to ensure smooth and consistent star movement
      const limitedDelta = Math.min(deltaTime, 0.05);
      for (const star of stars) {
        // We manually update stars here to have tighter control over speed
        star.graphics.x -= star.speed * limitedDelta * 60; // Normalize by frame rate
        
        // Reset position when star goes off screen
        if (star.graphics.x + star.size < 0) {
          star.graphics.x = GAME_WIDTH + star.size;
          star.graphics.y = Math.random() * GAME_HEIGHT;
        }
        
        // Handle blinking effect through the star's update method
        star.update();
      }
    }
  }
  
  /**
   * Render debug information
   */
  private renderDebugInfo(): void {
    if (!this.debugGraphics || !this.app) return;
    
    const gameState = this.state.getState();
    
    // Skip if debug mode is disabled
    if (!gameState.debugMode) {
      this.debugGraphics.clear();
      return;
    }
    
    this.debugGraphics.clear();
    
    // Get astronaut
    const astronaut = this.entities.getAstronaut();
    
    // Draw astronaut hitbox
    if (astronaut) {
      const spriteBounds = astronaut.sprite.getBounds();
      this.debugGraphics.lineStyle(1, 0xFFFF00, 0.5);
      this.debugGraphics.drawRect(
        spriteBounds.minX,
        spriteBounds.minY,
        spriteBounds.maxX - spriteBounds.minX,
        spriteBounds.maxY - spriteBounds.minY
      );
      
      // Draw astronaut's collision hitbox
      const astronautBounds = astronaut.getHitbox();
      this.debugGraphics.lineStyle(2, 0x00FF00);
      this.debugGraphics.drawRect(
        astronautBounds.minX,
        astronautBounds.minY,
        astronautBounds.maxX - astronautBounds.minX,
        astronautBounds.maxY - astronautBounds.minY
      );
    }
    
    // Draw obstacle hitboxes
    const obstacles = this.entities.getObstacles();
    for (const obstacle of obstacles) {
      if ('radius' in obstacle) {
        this.debugGraphics.lineStyle(2, 0xFF0000);
        
        const planet = obstacle as { x: number; y: number; radius: number };
        const planetBounds = new PIXI.Bounds();
        planetBounds.minX = planet.x - planet.radius;
        planetBounds.maxX = planet.x + planet.radius;
        planetBounds.minY = planet.y - planet.radius;
        planetBounds.maxY = planet.y + planet.radius;
        
        this.debugGraphics.drawRect(
          planetBounds.minX,
          planetBounds.minY,
          planetBounds.maxX - planetBounds.minX,
          planetBounds.maxY - planetBounds.minY
        );
      }
    }
    
    // Draw orb hitboxes
    const orbs = this.entities.getOrbs();
    for (const orb of orbs) {
      this.debugGraphics.lineStyle(2, 0x0000FF);
      
      const orbBounds = new PIXI.Bounds();
      orbBounds.minX = orb.x - orb.radius;
      orbBounds.maxX = orb.x + orb.radius;
      orbBounds.minY = orb.y - orb.radius;
      orbBounds.maxY = orb.y + orb.radius;
      
      this.debugGraphics.drawRect(
        orbBounds.minX,
        orbBounds.minY,
        orbBounds.maxX - orbBounds.minX,
        orbBounds.maxY - orbBounds.minY
      );
    }
  }
  
  /**
   * Add a display object to the stage
   */
  public add(displayObject: PIXI.ContainerChild): void {
    if (!this.app) return;
    this.app.stage.addChild(displayObject);
  }
  
  /**
   * Remove a display object from the stage
   */
  public remove(displayObject: PIXI.ContainerChild): void {
    if (!this.app) return;
    this.app.stage.removeChild(displayObject);
  }
  
  /**
   * Clear the entire stage
   */
  public clearStage(): void {
    if (!this.app || !this.app.stage) return;
    
    while (this.app.stage.children.length > 0) {
      this.app.stage.removeChildAt(0);
    }
    
    // Re-add debug graphics after clearing
    if (this.debugGraphics) {
      this.app.stage.addChild(this.debugGraphics);
    }
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    if (this.app && this.debugGraphics) {
      this.app.stage.removeChild(this.debugGraphics);
      this.debugGraphics = null;
    }
    
    this.initialized = false;
  }
} 