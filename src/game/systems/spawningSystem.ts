import { GameState } from '../gameStateService';
import { entityManager } from './entitySystem';
import { LEVELS, ORB_SPAWN_CHANCE, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Planet } from '../entities/Planet';
import { getLogger } from '../../utils/logger';

const logger = getLogger('SpawningSystem');

interface LevelConfig {
  speeds: {
    planet: number;
    secondaryPlanet: number;
    orb: number;
  };
  spawnInterval: number;
  orbFrequency?: number; // Time between orb spawns
}

/**
 * SpawningSystem handles spawning of obstacles, orbs, and other entities
 * based on game time and level.
 */
export class SpawningSystem {
  private static instance: SpawningSystem;
  private initialized: boolean = false;
  
  // Spawning state
  private lastObstacleTime: number = 0;
  private lastOrbTime: number = 0;
  private levelConfig: LevelConfig = { 
    speeds: {
      planet: 1.0,
      secondaryPlanet: 1.1,
      orb: 0.9
    }, 
    spawnInterval: 2500 
  };
  private hasSpawnedFirstObstacle: boolean = false;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): SpawningSystem {
    if (!SpawningSystem.instance) {
      SpawningSystem.instance = new SpawningSystem();
    }
    return SpawningSystem.instance;
  }
  
  /**
   * Initialize the SpawningSystem
   */
  public initialize(): void {
    if (this.initialized) return;
    
    this.resetSpawning();
    
    this.initialized = true;
    logger.info('SpawningSystem initialized');
  }
  
  /**
   * Reset spawning state
   */
  public resetSpawning(): void {
    this.lastObstacleTime = 0;
    this.lastOrbTime = 0;
    this.hasSpawnedFirstObstacle = false;
  }
  
  /**
   * Set level configuration
   */
  public setLevelConfig(config: LevelConfig): void {
    this.levelConfig = {
      ...this.levelConfig,
      ...config
    };
    logger.info('SpawningSystem: Level config updated', this.levelConfig);
  }
  
  /**
   * Update the spawning system
   */
  public update(deltaTime: number, gameState: GameState): void {
    if (!this.initialized) {
      logger.info('SpawningSystem: Not initialized, skipping update');
      return;
    }
    
    if (!gameState.isStarted) {
      if (Math.random() < 0.01) logger.debug('SpawningSystem: Game not started, skipping update');
      return;
    }
    
    if (gameState.isGameOver) {
      if (Math.random() < 0.01) logger.debug('SpawningSystem: Game over, skipping update');
      return;
    }
    
    const currentTime = gameState.time;
    
    // Occasionally log spawning status to avoid console spam
    if (Math.random() < 0.05) {
      logger.debug(`SpawningSystem: time=${currentTime.toFixed(2)}, lastObstacleTime=${this.lastObstacleTime.toFixed(2)}, interval=${this.levelConfig.spawnInterval}, planetSpeed=${this.levelConfig.speeds.planet}`);
      logger.debug(`SpawningSystem: hasSpawnedFirstObstacle=${this.hasSpawnedFirstObstacle}, obstacles=${entityManager.getObstacles().length}, orbs=${entityManager.getOrbs().length}`);
    }
    
    // Ensure first obstacle is spawned with a delay
    if (!this.hasSpawnedFirstObstacle && currentTime > 1500) {
      logger.info('SpawningSystem: Spawning first obstacle');
      this.spawnObstacle();
      this.lastObstacleTime = currentTime;
      this.hasSpawnedFirstObstacle = true;
    }
    // Then spawn regular obstacles
    else if (this.hasSpawnedFirstObstacle && currentTime - this.lastObstacleTime > this.levelConfig.spawnInterval) {
      logger.info(`SpawningSystem: Spawning obstacle at time=${currentTime.toFixed(2)}`);
      this.spawnObstacle();
      this.lastObstacleTime = currentTime;
      
      // Chance to spawn an orb alongside the obstacle (but not at the same position)
      if (Math.random() < ORB_SPAWN_CHANCE) {
        logger.info('SpawningSystem: Planning to spawn orb with delay');
        setTimeout(() => {
          if (gameState.isStarted && !gameState.isGameOver) {
            logger.info('SpawningSystem: Spawning orb after delay');
            this.spawnOrb();
          } else {
            logger.info('SpawningSystem: Cancelled orb spawn - game state changed');
          }
        }, this.levelConfig.spawnInterval * 0.4); // Stagger the orb spawn time
      }
    }
  }
  
  /**
   * Spawn an obstacle
   */
  private spawnObstacle(): void {
    const levelNumber = this.getCurrentLevelIndex() + 1;
    
    const minRadius = 20;
    const maxRadius = 40 + (levelNumber * 5);
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    
    const safeZoneSize = GAME_HEIGHT * 0.4;
    const safeZoneY = GAME_HEIGHT * 0.2 + Math.random() * (GAME_HEIGHT * 0.6);
    
    const positionAbove = Math.random() > 0.5;
    
    let planetY;
    if (positionAbove) {
      planetY = Math.random() * (safeZoneY - radius * 2) + radius;
    } else {
      planetY = safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius;
    }
    
    // Create the first planet with its specific speed
    const planet = entityManager.createPlanet(
      GAME_WIDTH + radius,
      planetY,
      radius,
      this.levelConfig.speeds.planet
    );
    
    // Ensure no overlap with existing obstacles
    this.ensureNoOverlap(planet);
    
    // Spawn a second planet with a probability
    if (Math.random() < 0.3 && levelNumber > 1) {
      // Determine the second planet's vertical position
      const secondPlanetY = positionAbove 
        ? safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius
        : Math.random() * (safeZoneY - radius * 2) + radius;
      
      // Calculate radius for second planet
      const secondRadius = radius * (0.7 + Math.random() * 0.6);
      
      // Create the second planet with a horizontal offset and its specific speed
      const secondPlanet = entityManager.createPlanet(
        GAME_WIDTH + radius + 100 + Math.random() * 150, // Ensure horizontal spacing
        secondPlanetY,
        secondRadius,
        this.levelConfig.speeds.secondaryPlanet
      );
      
      // Check for overlaps with all existing obstacles including the first planet
      this.ensureNoOverlap(secondPlanet);
    }
  }
  
  /**
   * Spawn an orb
   */
  private spawnOrb(): void {
    const radius = 12 + Math.random() * 6;
    
    const minY = GAME_HEIGHT * 0.2;
    const maxY = GAME_HEIGHT * 0.8;
    const orbY = minY + Math.random() * (maxY - minY);
    
    entityManager.createOrb(
      GAME_WIDTH + radius,
      orbY,
      radius,
      this.levelConfig.speeds.orb
    );
  }
  
  /**
   * Ensure no overlap between planet and other obstacles
   */
  private ensureNoOverlap(planet: Planet): void {
    // Maximum attempts to find a non-overlapping position
    const maxAttempts = 5;
    let attempts = 0;
    let overlapping = false;
    
    do {
      overlapping = false;
      
      // Get all obstacles from entity manager
      const obstacles = entityManager.getObstacles();
      
      // Check if this planet overlaps with any existing obstacles
      for (const obstacle of obstacles) {
        // Skip checking against self
        if (obstacle === planet) continue;
        
        // Only check obstacles that are planets and on screen
        if (obstacle instanceof Planet && !obstacle.isOffScreen()) {
          const existingPlanet = obstacle as Planet;
          
          if (this.planetsOverlap(planet, existingPlanet)) {
            overlapping = true;
            
            // Adjust vertical position to avoid overlap
            if (planet.y < existingPlanet.y) {
              // New planet is above existing, move it further up
              planet.y = Math.max(
                planet.radius, // Keep within game bounds
                existingPlanet.y - existingPlanet.radius - planet.radius - 20 // Add spacing
              );
            } else {
              // New planet is below existing, move it further down
              planet.y = Math.min(
                GAME_HEIGHT - planet.radius, // Keep within game bounds
                existingPlanet.y + existingPlanet.radius + planet.radius + 20 // Add spacing
              );
            }
            
            // If we've made too many attempts, try changing horizontal position
            if (attempts > 2) {
              // Move the planet a bit further to the right
              planet.x += planet.radius * 1.2;
            }
            
            // Update graphics position
            planet.graphics.y = planet.y;
            planet.glowGraphics.y = planet.y;
            planet.graphics.x = planet.x;
            planet.glowGraphics.x = planet.x;
            
            // Break to recheck with the new position
            break;
          }
        }
      }
      
      attempts++;
    } while (overlapping && attempts < maxAttempts);
  }
  
  /**
   * Check if two planets overlap
   */
  private planetsOverlap(planet1: Planet, planet2: Planet): boolean {
    // Calculate the distance between planet centers
    const dx = planet2.x - planet1.x;
    const dy = planet2.y - planet1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If the distance is less than the sum of radii (plus some buffer space)
    // then planets overlap
    const minSeparation = planet1.radius + planet2.radius + 10; // 10px buffer
    
    return distance < minSeparation;
  }
  
  /**
   * Get current level index
   */
  private getCurrentLevelIndex(): number {
    // This should come from level configuration service or similar
    // For now, just hardcode level 0 (which is level 1 in the UI)
    return 0;
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    this.initialized = false;
    logger.info('SpawningSystem disposed');
  }
}

// Export a default instance for convenient imports
export const spawningSystem = SpawningSystem.getInstance(); 