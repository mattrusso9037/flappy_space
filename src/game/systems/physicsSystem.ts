import { Astronaut } from '../entities/Astronaut';
import { Obstacle } from '../entities/Obstacle';
import { Orb } from '../entities/Orb';
import { gameStateService } from '../gameStateService';
import { entityManager } from './entitySystem';
import { eventBus, GameEvent } from '../eventBus';
import { getLogger } from '../../utils/logger';

const logger = getLogger('PhysicsSystem');

/**
 * PhysicsSystem handles physics calculations, movement, and collisions.
 */
export class PhysicsSystem {
  private static instance: PhysicsSystem;
  private initialized: boolean = false;
  private scrollSpeed: number = 0;
  private lastSpeedDiagnosticTime: number = 0;
  private speedDiagnosticInterval: number = 5000; // Log all speeds every 5 seconds
  
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
    logger.info('PhysicsSystem initialized');
  }
  
  /**
   * Set the scroll speed for obstacles and entities
   */
  public setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
    logger.info(`Scroll speed set to ${speed}`);
  }
  
  /**
   * Enable or disable periodic speed diagnostics
   */
  public setSpeedDiagnostics(enabled: boolean, intervalMs: number = 5000): void {
    this.speedDiagnosticInterval = enabled ? intervalMs : 0;
    logger.info(`Speed diagnostics ${enabled ? 'enabled' : 'disabled'}, interval: ${intervalMs}ms`);
    
    // Enable/disable obstacle tracking too
    Obstacle.enableSpeedTracking(enabled);
    Obstacle.setSpeedLoggingInterval(Math.floor(intervalMs / 2)); // Stagger logs
  }
  
  /**
   * Log diagnostic information about all obstacle speeds
   */
  public logObstacleSpeedDiagnostics(): void {
    const obstacles = entityManager.getObstacles();
    if (obstacles.length === 0) {
      logger.info('No obstacles to analyze');
      return;
    }
    
    const orbs = entityManager.getOrbs();
    const totalEntities = obstacles.length + orbs.length;
    
    // Calculate speed stats for obstacles
    const speedRatios = obstacles.map(o => o.getSpeedStats().ratio);
    const avgSpeedRatio = speedRatios.reduce((sum, ratio) => sum + ratio, 0) / speedRatios.length;
    const minSpeedRatio = Math.min(...speedRatios);
    const maxSpeedRatio = Math.max(...speedRatios);
    
    // Calculate stats for orbs too if they exist
    let orbStats = { count: 0, avgRatio: 0, minRatio: 0, maxRatio: 0 };
    if (orbs.length > 0) {
      const orbRatios = orbs.map(o => o.getSpeedStats().ratio);
      orbStats = {
        count: orbs.length,
        avgRatio: orbRatios.reduce((sum, ratio) => sum + ratio, 0) / orbRatios.length,
        minRatio: Math.min(...orbRatios),
        maxRatio: Math.max(...orbRatios)
      };
    }
    
    logger.info('===== SPEED DIAGNOSTICS =====');
    logger.info(`Total entities: ${totalEntities} (${obstacles.length} obstacles, ${orbs.length} orbs)`);
    logger.info(`Obstacles - Avg ratio: ${avgSpeedRatio.toFixed(4)}, Min: ${minSpeedRatio.toFixed(4)}, Max: ${maxSpeedRatio.toFixed(4)}`);
    
    if (orbs.length > 0) {
      logger.info(`Orbs - Avg ratio: ${orbStats.avgRatio.toFixed(4)}, Min: ${orbStats.minRatio.toFixed(4)}, Max: ${orbStats.maxRatio.toFixed(4)}`);
    }
    
    // Log individual obstacles only if there's a significant deviation
    const significantDeviation = 0.1; // 10% speed difference
    obstacles.forEach(obstacle => {
      const stats = obstacle.getSpeedStats();
      if (Math.abs(stats.ratio - 1.0) > significantDeviation) {
        logger.warn(`${stats.id} has significant speed deviation: ${stats.ratio.toFixed(4)} (current: ${stats.currentSpeed.toFixed(4)}, initial: ${stats.initialSpeed.toFixed(4)})`);
      }
    });
    
    logger.info('=============================');
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
      logger.debug(`Update called with deltaTime: ${deltaTime}`);
      if (astronaut) {
        logger.debug(`Astronaut position: x=${astronaut.sprite.x}, y=${astronaut.sprite.y}, vel=${astronaut.velocity}`);
      }
      logger.debug(`Active entities - obstacles: ${entityManager.getObstacles().length}, orbs: ${entityManager.getOrbs().length}`);
    }
    
    // Periodic speed diagnostics if enabled
    if (this.speedDiagnosticInterval > 0) {
      const now = performance.now();
      if (now - this.lastSpeedDiagnosticTime > this.speedDiagnosticInterval) {
        this.logObstacleSpeedDiagnostics();
        this.lastSpeedDiagnosticTime = now;
      }
    }
    
    // Update astronaut physics
    if (astronaut) {
      astronaut.update(deltaTime * 1000); // Convert seconds to milliseconds for astronaut
      
      // Check if astronaut died from physics (e.g., hitting bottom of screen)
      if (astronaut.dead) {
        logger.info('PhysicsSystem: Astronaut died from physics (hit boundary)');
        eventBus.emit(GameEvent.COLLISION_DETECTED, null);
      }
    }
    
    // Update obstacles and check for collisions
    const obstacles = entityManager.getObstacles();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      
      // Update obstacle position, passing deltaTime
      obstacle.update(deltaTime);
      
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
      
      // Update orb position, passing deltaTime
      orb.update(deltaTime);
      
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
    logger.info('PhysicsSystem disposed');
  }
}

// Export a default instance for convenient imports
export const physicsSystem = PhysicsSystem.getInstance(); 