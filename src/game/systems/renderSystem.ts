import * as PIXI from 'pixi.js';
import { entityManager } from './entityManager';
import { gameStateService } from '../gameStateService';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * RenderSystem manages all rendering operations for the game.
 */
export class RenderSystem {
  private static instance: RenderSystem;
  private app: PIXI.Application | null = null;
  private debugGraphics: PIXI.Graphics | null = null;
  private initialized: boolean = false;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): RenderSystem {
    if (!RenderSystem.instance) {
      RenderSystem.instance = new RenderSystem();
    }
    return RenderSystem.instance;
  }
  
  /**
   * Initialize the RenderSystem with the PIXI application
   */
  public initialize(app: PIXI.Application): void {
    if (this.initialized) return;
    
    this.app = app;
    
    // Set up debug graphics
    this.debugGraphics = new PIXI.Graphics();
    this.app.stage.addChild(this.debugGraphics);
    
    this.initialized = true;
    console.log('RenderSystem initialized');
  }
  
  /**
   * Update the render system (called every frame)
   */
  public update(deltaTime: number, entities: any[]): void {
    if (!this.initialized || !this.app) return;
    
    // Occasionally log rendering info to avoid console spam
    if (Math.random() < 0.01) {
      console.log(`RenderSystem: Updating visuals, entities: ${entities.length}`);
      console.log(`RenderSystem: Stage contains ${this.app.stage.children.length} display objects`);
    }
    
    // Render debug information if enabled
    this.renderDebugInfo();
  }
  
  /**
   * Create the background with stars
   */
  public createBackground(): void {
    if (!this.initialized) return;
    
    entityManager.createBackground();
  }
  
  /**
   * Update background elements like stars even when game isn't officially started
   */
  public updateBackground(deltaTime: number): void {
    if (!this.initialized) return;
    
    // Get all stars and update their positions
    const stars = entityManager.getStars();
    if (stars.length > 0) {
      // Occasionally log star updates
      if (Math.random() < 0.01) {
        console.log(`RenderSystem: Animating ${stars.length} background stars`);
      }
      
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
    
    const gameState = gameStateService.getState();
    
    // Skip if debug mode is disabled
    if (!gameState.debugMode) {
      this.debugGraphics.clear();
      return;
    }
    
    this.debugGraphics.clear();
    
    // Get astronaut
    const astronaut = entityManager.getAstronaut();
    
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
    const obstacles = entityManager.getObstacles();
    for (const obstacle of obstacles) {
      if ('radius' in obstacle) {
        this.debugGraphics.lineStyle(2, 0xFF0000);
        
        const planetBounds = new PIXI.Bounds();
        planetBounds.minX = obstacle.x - (obstacle as any).radius;
        planetBounds.maxX = obstacle.x + (obstacle as any).radius;
        planetBounds.minY = obstacle.y - (obstacle as any).radius;
        planetBounds.maxY = obstacle.y + (obstacle as any).radius;
        
        this.debugGraphics.drawRect(
          planetBounds.minX,
          planetBounds.minY,
          planetBounds.maxX - planetBounds.minX,
          planetBounds.maxY - planetBounds.minY
        );
      }
    }
    
    // Draw orb hitboxes
    const orbs = entityManager.getOrbs();
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
  public add(displayObject: any): void {
    if (!this.app) return;
    this.app.stage.addChild(displayObject);
  }
  
  /**
   * Remove a display object from the stage
   */
  public remove(displayObject: any): void {
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
    console.log('RenderSystem disposed');
  }
}

// Export a default instance for convenient imports
export const renderSystem = RenderSystem.getInstance(); 