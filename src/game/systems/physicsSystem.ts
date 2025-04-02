import { Astronaut } from '../entities/Astronaut';
import { Obstacle } from '../entities/Obstacle';
import { Orb } from '../entities/Orb';
import { gameStateService } from '../gameStateService';
import { entityManager } from './entityManager';
import { eventBus, GameEvent } from '../eventBus';

/**
 * PhysicsSystem handles physics calculations, movement, and collisions.
 */
export class PhysicsSystem {
  private static instance: PhysicsSystem;
  private initialized: boolean = false;
  private scrollSpeed: number = 0;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): PhysicsSystem {
    if (!PhysicsSystem.instance) {
      PhysicsSystem.instance = new PhysicsSystem();
    }
    return PhysicsSystem.instance;
  }
  
  /**
   * Initialize the PhysicsSystem
   */
  public initialize(): void {
    if (this.initialized) return;
    
    this.initialized = true;
    console.log('PhysicsSystem initialized');
  }
  
  /**
   * Set the scroll speed for obstacles and entities
   */
  public setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
  }
  
  /**
   * Update physics for all entities
   */
  public update(deltaTime: number, entities: any[]): void {
    if (!this.initialized) return;
    
    const astronaut = entityManager.getAstronaut();
    
    // Skip physics update if game is over or not started
    if (!gameStateService.getState().isStarted || 
        gameStateService.getState().isGameOver) {
      return;
    }
    
    // Log physics updates occasionally to avoid console spam
    if (Math.random() < 0.01) {
      console.log(`PhysicsSystem: Update called with deltaTime: ${deltaTime}`);
      if (astronaut) {
        console.log(`PhysicsSystem: Astronaut position: x=${astronaut.sprite.x}, y=${astronaut.sprite.y}, vel=${astronaut.velocity}`);
      }
      console.log(`PhysicsSystem: Active entities - obstacles: ${entityManager.getObstacles().length}, orbs: ${entityManager.getOrbs().length}`);
    }
    
    // Update astronaut physics
    if (astronaut) {
      astronaut.update(deltaTime * 1000); // Convert seconds to milliseconds for astronaut
      
      // Check if astronaut died from physics (e.g., hitting bottom of screen)
      if (astronaut.dead) {
        console.log('PhysicsSystem: Astronaut died from physics (hit boundary)');
        eventBus.emit(GameEvent.COLLISION_DETECTED, null);
      }
    }
    
    // Update obstacles and check for collisions
    const obstacles = entityManager.getObstacles();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      
      // Update obstacle position
      obstacle.update();
      
      // Check if astronaut has passed the obstacle
      if (astronaut && obstacle.isPassed(astronaut.sprite.x)) {
        // Emit obstacle passed event
        eventBus.emit(GameEvent.OBSTACLE_PASSED, obstacle);
        
        // Update score via gameStateService
        gameStateService.incrementScore(10); // SCORE_PER_OBSTACLE from config
      }
      
      // Check for collision with astronaut
      if (astronaut && !astronaut.dead && obstacle.checkCollision(astronaut)) {
        // Astronaut hit an obstacle
        astronaut.die();
        
        // Emit collision event
        eventBus.emit(GameEvent.COLLISION_DETECTED, {
          astronaut,
          obstacle
        });
      }
      
      // Remove obstacles that are off screen
      if (obstacle.isOffScreen()) {
        entityManager.removeObstacle(obstacle);
      }
    }
    
    // Update orbs and check for collisions
    const orbs = entityManager.getOrbs();
    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      
      // Update orb position
      orb.update();
      
      // Check for collision with astronaut
      if (astronaut && !astronaut.dead && !orb.collected && orb.checkCollision(astronaut)) {
        // Mark orb as collected
        orb.collect();
        
        // Update game state
        gameStateService.collectOrb();
        
        // Increment score for orb collection
        gameStateService.incrementScore(50); // ORB_POINTS from config
      }
      
      // Remove orbs that are off screen or collected
      if (orb.isOffScreen() || orb.collected) {
        entityManager.removeOrb(orb);
      }
    }
    
    // Update stars (parallax effect)
    const stars = entityManager.getStars();
    stars.forEach(star => star.update());
  }
  
  /**
   * Check for all collisions
   */
  private checkCollisions(astronaut: Astronaut): void {
    if (!astronaut || astronaut.dead) return;
    
    // Check collisions with obstacles
    const obstacles = entityManager.getObstacles();
    for (const obstacle of obstacles) {
      if (obstacle.checkCollision(astronaut)) {
        astronaut.die();
        eventBus.emit(GameEvent.COLLISION_DETECTED, {
          astronaut,
          obstacle
        });
        return; // Exit after first collision
      }
    }
    
    // Check collisions with orbs
    const orbs = entityManager.getOrbs();
    for (const orb of orbs) {
      if (!orb.collected && orb.checkCollision(astronaut)) {
        orb.collect();
        gameStateService.collectOrb();
        gameStateService.incrementScore(50); // ORB_POINTS from config
      }
    }
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    this.initialized = false;
    console.log('PhysicsSystem disposed');
  }
}

// Export a default instance for convenient imports
export const physicsSystem = PhysicsSystem.getInstance(); 