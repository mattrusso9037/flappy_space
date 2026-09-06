import { PlayerToolSystem } from './PlayerToolSystem';
import { resolveSolidMotion } from './solidCollision';
import { ASTRONAUT, GAME_WIDTH } from '../config';
import { Obstacle } from '../entities/Obstacle';
import { GameStateService } from '../gameStateService';
import { EntitySystem } from './entitySystem';
import { EventBus, GameEvent } from '../eventBus';
import { getLogger } from '../../utils/logger';

const logger = getLogger('PhysicsSystem');

/**
 * PhysicsSystem handles physics calculations, movement, and collisions.
 */
export class PhysicsSystem {
  private initialized: boolean = false;
  private scrollSpeed: number = 0;
  private lastSpeedDiagnosticTime: number = 0;
  private speedDiagnosticInterval: number = 0; // 0 = disabled by default, enabled only via debugMode
  
  public constructor(
    private readonly entities: EntitySystem,
    private readonly state: GameStateService,
    private readonly events: EventBus,
    private readonly tools?: PlayerToolSystem
  ) {}
  
  /**
   * Initialize the PhysicsSystem
   */
  public initialize(): void {
    if (this.initialized) return;
    
    this.initialized = true;
    this.setSpeedDiagnostics(this.state.getState().debugMode);
    logger.info('PhysicsSystem initialized');
  }
  
  /**
   * Set the scroll speed for obstacles and entities
   */
  public setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
    logger.info(`Scroll speed set to ${speed}`);
  }

  public getScrollSpeed(): number {
    return this.scrollSpeed;
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
    const obstacles = this.entities.getObstacles();
    if (obstacles.length === 0) {
      logger.info('No obstacles to analyze');
      return;
    }
    
    const orbs = this.entities.getOrbs();
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
  public update(deltaTime: number, _entities?: unknown[]): void {
    if (!this.initialized) return;
    
    const astronaut = this.entities.getAstronaut();
    
    // Skip physics update if game is over or not started
    if (!this.state.getState().isStarted || 
        this.state.getState().isGameOver) {
      return;
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
      const previous = { x: astronaut.worldX, y: astronaut.sprite.y };
      this.tools?.applyGrapple(deltaTime);
      astronaut.update(deltaTime * 1000); // Convert seconds to milliseconds for astronaut
      
      if (astronaut.getMovementMode() === 'ground' && this.entities.getSolidBounds().length > 0) {
        const resolved = resolveSolidMotion(previous, { x: astronaut.worldX, y: astronaut.sprite.y },
          ASTRONAUT.body, this.entities.getSolidBounds());
        astronaut.worldX = astronaut.sprite.x = resolved.x;
        astronaut.sprite.y = resolved.y;
        if (resolved.hitX) astronaut.horizontalVelocity = 0;
        if (resolved.hitY) astronaut.velocity = 0;
        if (resolved.landed) {
          astronaut.isGrounded = true;
          astronaut.rechargeThrust();
        }
      }

      // Check if astronaut died from physics (e.g., hitting bottom of screen in space)
      if (astronaut.dead) {
        logger.info('PhysicsSystem: Astronaut died from physics (hit boundary)');
        this.events.emit(GameEvent.COLLISION_DETECTED, null);
      }
    }
    
    this.entities.showGrapple(this.tools?.getAttachment() ?? null);

    // Update obstacles and check for collisions
    const worldSpace = this.entities.isWorldSpace();
    const obstacles = this.entities.getObstacles();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      
      // Update obstacle position, passing deltaTime
      if (!worldSpace) obstacle.update(deltaTime);
      
      // Check if astronaut has passed the obstacle
      if (!worldSpace && astronaut && obstacle.isPassed(astronaut.sprite.x)) {
        // Emit obstacle passed event
        this.events.emit(GameEvent.OBSTACLE_PASSED, obstacle);
        
        // Update score via gameStateService
        this.state.incrementScore(10); // SCORE_PER_OBSTACLE from config
      }
      
      // Check for collision with astronaut
      if (astronaut && !astronaut.dead && obstacle.checkCollision(astronaut)) {
        // Astronaut hit an obstacle
        astronaut.die();
        
        // Emit collision event
        this.events.emit(GameEvent.COLLISION_DETECTED, {
          astronaut,
          obstacle
        });
      }
      
      // Remove obstacles that are off screen
      if ((!worldSpace && obstacle.isOffScreen()) || (this.entities.getWorldDef()?.traversal === 'loop' && astronaut && Math.abs(obstacle.x - astronaut.worldX) > GAME_WIDTH * 2)) {
        this.entities.removeObstacle(obstacle);
      }
    }
    
    // Update orbs and check for collisions
    const orbs = this.entities.getOrbs();
    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      
      // Update orb position, passing deltaTime
      if (!worldSpace) orb.update(deltaTime);
      
      // Check for collision with astronaut
      if (astronaut && !astronaut.dead && !orb.collected && orb.checkCollision(astronaut)) {
        // Mark orb as collected
        orb.collect();
        
        // Update game state (awards ORB_POINTS exactly once)
        this.state.collectOrb();
        
        // Emit presentation event for audio and visual feedback
        this.events.emit(GameEvent.ORB_COLLECTED, {
          x: orb.x,
          y: orb.y,
          radius: orb.radius,
          speed: orb.speed
        });
      }
      
      // Remove orbs that are off screen or collected
      if ((!worldSpace && orb.isOffScreen()) || orb.collected || (!orb.worldPersistent && this.entities.getWorldDef()?.traversal === 'loop' && astronaut && Math.abs(orb.x - astronaut.worldX) > GAME_WIDTH * 2)) {
        this.entities.removeOrb(orb);
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
