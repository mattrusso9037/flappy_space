import { GameState, GameStateService } from '../gameStateService';
import { EntitySystem } from './entitySystem';
import { ORB_SPAWN_CHANCE, GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config';
import { Planet } from '../entities/Planet';
import { getLogger } from '../../utils/logger';

const logger = getLogger('SpawningSystem');

export interface LevelConfig {
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
 * based on simulation time and level configuration.
 */
export class SpawningSystem {
  private initialized: boolean = false;
  private readonly entities: EntitySystem;
  private readonly state?: GameStateService;
  
  // Spawning state
  private lastObstacleTime: number = 0;
  private lastOrbTime: number = 0;
  private pendingOrbSpawnRemainingMs: number = 0;
  private levelConfig: LevelConfig = { 
    speeds: {
      planet: 1.0,
      secondaryPlanet: 1.1,
      orb: 0.9
    }, 
    spawnInterval: 2500 
  };
  private hasSpawnedFirstObstacle: boolean = false;
  
  public constructor(
    entities: EntitySystem,
    state?: GameStateService
  ) {
    this.entities = entities;
    this.state = state;
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
    this.pendingOrbSpawnRemainingMs = 0;
    this.hasSpawnedFirstObstacle = false;
  }

  /**
   * Initialize configuration for a specific level
   */
  public initializeLevel(level: number): void {
    const config = LEVELS[level - 1] || LEVELS[0];
    this.setLevelConfig({
      speeds: config.speeds,
      spawnInterval: config.spawnInterval,
      orbFrequency: config.orbFrequency || 3000,
    });
    this.resetSpawning();
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

  public getLevelConfig(): LevelConfig {
    return this.levelConfig;
  }
  
  /**
   * Update the spawning system using simulation delta time
   */
  public update(deltaTime: number, gameState: GameState): void {
    if (!this.initialized) {
      return;
    }
    
    if (!gameState.isStarted || gameState.isGameOver) {
      return;
    }
    
    const deltaMs = deltaTime * 1000;

    // Process pending delayed orb spawn via simulation time
    if (this.pendingOrbSpawnRemainingMs > 0) {
      this.pendingOrbSpawnRemainingMs -= deltaMs;
      if (this.pendingOrbSpawnRemainingMs <= 0) {
        this.pendingOrbSpawnRemainingMs = 0;
        if (gameState.isStarted && !gameState.isGameOver) {
          logger.info('SpawningSystem: Spawning orb after simulation delay');
          this.spawnOrb();
        }
      }
    }

    const currentTime = gameState.time;
    
    // Ensure first obstacle is spawned with an initial delay
    if (!this.hasSpawnedFirstObstacle && currentTime > 1500) {
      logger.info('SpawningSystem: Spawning first obstacle');
      this.spawnObstacle(gameState);
      this.lastObstacleTime = currentTime;
      this.hasSpawnedFirstObstacle = true;
    }
    // Then spawn regular obstacles according to interval
    else if (this.hasSpawnedFirstObstacle && currentTime - this.lastObstacleTime > this.levelConfig.spawnInterval) {
      logger.info(`SpawningSystem: Spawning obstacle at time=${currentTime.toFixed(2)}`);
      this.spawnObstacle(gameState);
      this.lastObstacleTime = currentTime;
      
      // Stagger orb spawn using simulation time countdown
      if (Math.random() < ORB_SPAWN_CHANCE) {
        logger.info('SpawningSystem: Scheduling delayed orb spawn in simulation time');
        this.pendingOrbSpawnRemainingMs = this.levelConfig.spawnInterval * 0.4;
      }
    }
  }
  
  /**
   * Spawn an obstacle based on current level configuration
   */
  private spawnObstacle(gameState?: GameState): void {
    const levelNumber = this.getCurrentLevelIndex(gameState) + 1;
    
    const minRadius = 20;
    const maxRadius = 40 + (levelNumber * 5);
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    
    const safeZoneSize = GAME_HEIGHT * 0.4;
    const safeZoneY = GAME_HEIGHT * 0.2 + Math.random() * (GAME_HEIGHT * 0.6);
    
    const positionAbove = Math.random() > 0.5;
    
    let planetY: number;
    if (positionAbove) {
      planetY = Math.random() * (safeZoneY - radius * 2) + radius;
    } else {
      planetY = safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius;
    }
    
    // Create the primary planet with level speed
    const planet = this.entities.createPlanet(
      GAME_WIDTH + radius,
      planetY,
      radius,
      this.levelConfig.speeds.planet
    );
    
    this.ensureNoOverlap(planet);
    
    // Spawn secondary planet on levels > 1
    if (Math.random() < 0.3 && levelNumber > 1) {
      const secondPlanetY = positionAbove 
        ? safeZoneY + safeZoneSize + Math.random() * (GAME_HEIGHT - (safeZoneY + safeZoneSize) - radius * 2) + radius
        : Math.random() * (safeZoneY - radius * 2) + radius;
      
      const secondRadius = radius * (0.7 + Math.random() * 0.6);
      
      const secondPlanet = this.entities.createPlanet(
        GAME_WIDTH + radius + 100 + Math.random() * 150,
        secondPlanetY,
        secondRadius,
        this.levelConfig.speeds.secondaryPlanet
      );
      
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
    
    this.entities.createOrb(
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
    const maxAttempts = 5;
    let attempts = 0;
    let overlapping = false;
    
    do {
      overlapping = false;
      const obstacles = this.entities.getObstacles();
      
      for (const obstacle of obstacles) {
        if (obstacle === planet) continue;
        
        if (obstacle instanceof Planet && !obstacle.isOffScreen()) {
          const existingPlanet = obstacle as Planet;
          
          if (this.planetsOverlap(planet, existingPlanet)) {
            overlapping = true;
            
            if (planet.y < existingPlanet.y) {
              planet.y = Math.max(
                planet.radius,
                existingPlanet.y - existingPlanet.radius - planet.radius - 20
              );
            } else {
              planet.y = Math.min(
                GAME_HEIGHT - planet.radius,
                existingPlanet.y + existingPlanet.radius + planet.radius + 20
              );
            }
            
            if (attempts > 2) {
              planet.x += planet.radius * 1.2;
            }
            
            planet.graphics.y = planet.y;
            planet.glowGraphics.y = planet.y;
            planet.graphics.x = planet.x;
            planet.glowGraphics.x = planet.x;
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
    const dx = planet2.x - planet1.x;
    const dy = planet2.y - planet1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minSeparation = planet1.radius + planet2.radius + 10;
    return distance < minSeparation;
  }
  
  /**
   * Get current level index from supplied state, injected state, or default 0
   */
  private getCurrentLevelIndex(gameState?: GameState): number {
    if (gameState && typeof gameState.level === 'number') {
      return Math.max(0, gameState.level - 1);
    }
    if (this.state) {
      return Math.max(0, this.state.getState().level - 1);
    }
    return 0;
  }
  
  /**
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    this.pendingOrbSpawnRemainingMs = 0;
    this.initialized = false;
    logger.info('SpawningSystem disposed');
  }
}