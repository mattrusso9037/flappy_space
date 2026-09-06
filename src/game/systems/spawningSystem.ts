import { GameState, GameStateService } from '../gameStateService';
import { EntitySystem } from './entitySystem';
import { ORB_SPAWN_CHANCE, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { DEFAULT_CAMPAIGN } from '../campaign/defaultCampaign';
import { ObstacleGameplayDefinition } from '../campaign/campaignTypes';
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
  orbSpawnChance?: number;
  /** @deprecated Use orbSpawnChance instead */
  orbFrequency?: number;
  obstacles?: ObstacleGameplayDefinition;
  /** Optional display metadata only - does NOT dictate gameplay difficulty */
  levelNumber?: number;
}

/**
 * SpawningSystem handles spawning of obstacles, orbs, and other entities
 * based on simulation time and explicit level configuration.
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
      orb: 0.9,
    }, 
    spawnInterval: 2500,
    orbSpawnChance: ORB_SPAWN_CHANCE,
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 45,
      secondaryPlanetChance: 0,
    },
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
   * Initialize configuration for a specific level index or level config
   */
  public initializeLevel(levelOrConfig: number | LevelConfig): void {
    if (typeof levelOrConfig === 'number') {
      const sectorKey = `sector-${String(levelOrConfig).padStart(2, '0')}`;
      const def = DEFAULT_CAMPAIGN.levels[sectorKey] || DEFAULT_CAMPAIGN.levels[DEFAULT_CAMPAIGN.startingLevelId];
      this.setLevelConfig({
        speeds: def.gameplay.speeds,
        spawnInterval: def.gameplay.spawnInterval,
        orbSpawnChance: def.gameplay.orbSpawnChance,
        obstacles: def.gameplay.obstacles,
        levelNumber: def.gameplay.levelNumber ?? levelOrConfig,
      });
    } else {
      this.setLevelConfig(levelOrConfig);
    }
    this.resetSpawning();
  }
  
  /**
   * Set level configuration
   */
  public setLevelConfig(config: Partial<LevelConfig>): void {
    this.levelConfig = {
      ...this.levelConfig,
      ...config,
      // If nested obstacles are partially supplied, merge them
      obstacles: config.obstacles
        ? { ...(this.levelConfig.obstacles ?? { minPlanetRadius: 20, maxPlanetRadius: 45, secondaryPlanetChance: 0 }), ...config.obstacles }
        : this.levelConfig.obstacles,
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
      
      // Stagger orb spawn using simulation time countdown governed by explicit orbSpawnChance
      const orbChance = this.levelConfig.orbSpawnChance ?? ORB_SPAWN_CHANCE;
      if (Math.random() < orbChance) {
        logger.info('SpawningSystem: Scheduling delayed orb spawn in simulation time', { orbChance });
        this.pendingOrbSpawnRemainingMs = this.levelConfig.spawnInterval * 0.4;
      }
    }
  }
  
  /**
   * Spawn an obstacle based explicitly on authored obstacle configuration.
   * Obstacle size and secondary spawn chance are entirely data-driven,
   * with zero implicit dependence on levelNumber.
   */
  private spawnObstacle(_gameState?: GameState): void {
    const minRadius = this.levelConfig.obstacles?.minPlanetRadius ?? 20;
    const maxRadius = this.levelConfig.obstacles?.maxPlanetRadius ?? 45;
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
    
    // Spawn secondary planet based explicitly on secondaryPlanetChance
    const secondaryChance = this.levelConfig.obstacles?.secondaryPlanetChance ?? 0;
    if (secondaryChance > 0 && Math.random() < secondaryChance) {
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
   * Clean up resources when the system is no longer needed
   */
  public dispose(): void {
    this.pendingOrbSpawnRemainingMs = 0;
    this.initialized = false;
    logger.info('SpawningSystem disposed');
  }
}