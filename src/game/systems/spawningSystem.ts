import { GameState, GameStateService } from '../gameStateService';
import { EntitySystem } from './entitySystem';
import { ORB_SPAWN_CHANCE, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { DEFAULT_CAMPAIGN } from '../campaign/defaultCampaign';
import { ObstacleGameplayDefinition, GroundGameplayDefinition, OrbGameplayDefinition } from '../campaign/campaignTypes';
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
  obstacles?: ObstacleGameplayDefinition;
  ground?: GroundGameplayDefinition;
  orbs: OrbGameplayDefinition;
  /** Optional display metadata only - does NOT dictate gameplay difficulty */
  levelNumber?: number;
}

/**
 * Safely compute a random value in [min, max].
 * Guarantees no NaN and never multiplies Math.random() by a negative range.
 */
export function safeRandomInRange(min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (min >= max) return min;
  return min + Math.random() * (max - min);
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
    obstacles: {
      minPlanetRadius: 20,
      maxPlanetRadius: 45,
      secondaryPlanetChance: 0,
    },
    orbs: {
      spawnChance: ORB_SPAWN_CHANCE,
    },
  };
  private hasSpawnedFirstObstacle: boolean = false;
  private hasSpawnedFirstOrb: boolean = false;
  
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
    this.hasSpawnedFirstOrb = false;
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
        obstacles: def.gameplay.obstacles,
        ground: def.gameplay.ground,
        orbs: def.gameplay.orbs,
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
      // If obstacles configured, handle enabled: false cleanly without requiring planet radii
      obstacles: config.obstacles
        ? config.obstacles.enabled === false
          ? { enabled: false }
          : {
              minPlanetRadius: config.obstacles.minPlanetRadius ?? 20,
              maxPlanetRadius: config.obstacles.maxPlanetRadius ?? 45,
              secondaryPlanetChance: config.obstacles.secondaryPlanetChance ?? 0,
              enabled: config.obstacles.enabled ?? true,
            }
        : this.levelConfig.obstacles,
      ground: config.ground,
      orbs: config.orbs ? { ...config.orbs } : this.levelConfig.orbs,
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
    const obstaclesEnabled = this.levelConfig.obstacles?.enabled !== false;
    const independentOrbs = !obstaclesEnabled || this.levelConfig.orbs?.spawnInterval !== undefined;

    if (obstaclesEnabled) {
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
        
        // Stagger orb spawn using simulation time countdown governed by explicit orb spawnChance
        if (!independentOrbs) {
          const orbChance = this.levelConfig.orbs?.spawnChance ?? ORB_SPAWN_CHANCE;
          if (Math.random() < orbChance) {
            logger.info('SpawningSystem: Scheduling delayed orb spawn in simulation time', { orbChance });
            this.pendingOrbSpawnRemainingMs = this.levelConfig.spawnInterval * 0.4;
          }
        }
      }
    }

    // Independent orb spawning cadence (when obstacles are disabled, or explicit orbs.spawnInterval configured)
    if (independentOrbs) {
      const orbInterval = this.levelConfig.orbs?.spawnInterval ?? this.levelConfig.spawnInterval;
      const orbChance = this.levelConfig.orbs?.spawnChance ?? ORB_SPAWN_CHANCE;

      if (!this.hasSpawnedFirstOrb && currentTime > 1500) {
        logger.info('SpawningSystem: Initial independent orb spawn check');
        this.hasSpawnedFirstOrb = true;
        this.lastOrbTime = currentTime;
        if (Math.random() < orbChance) {
          this.spawnOrb();
        }
      } else if (this.hasSpawnedFirstOrb && currentTime - this.lastOrbTime > orbInterval) {
        logger.info(`SpawningSystem: Independent orb spawn check at time=${currentTime.toFixed(2)}`);
        this.lastOrbTime = currentTime;
        if (Math.random() < orbChance) {
          this.spawnOrb();
        }
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
    const radius = safeRandomInRange(minRadius, maxRadius);
    
    const safeZoneSize = GAME_HEIGHT * 0.4;
    const safeZoneY = GAME_HEIGHT * 0.2 + Math.random() * (GAME_HEIGHT * 0.6);
    
    const positionAbove = Math.random() > 0.5;
    
    const groundY = this.entities.getGroundY() ?? GAME_HEIGHT;
    const minAllowedY = radius;
    const maxAllowedY = Math.max(minAllowedY, groundY - radius);

    let planetY: number;
    if (positionAbove) {
      const maxUpper = Math.min(safeZoneY - radius, maxAllowedY);
      planetY = safeRandomInRange(minAllowedY, maxUpper);
    } else {
      const minLower = safeZoneY + safeZoneSize + radius;
      planetY = safeRandomInRange(Math.min(minLower, maxAllowedY), maxAllowedY);
    }
    planetY = Math.max(minAllowedY, Math.min(planetY, maxAllowedY));
    
    // Create the primary planet with level speed
    const planet = this.entities.createPlanet(
      this.getSpawnX(radius),
      planetY,
      radius,
      this.levelConfig.speeds.planet
    );
    
    this.ensureNoOverlap(planet);
    
    // Spawn secondary planet based explicitly on secondaryPlanetChance
    const secondaryChance = this.levelConfig.obstacles?.secondaryPlanetChance ?? 0;
    if (secondaryChance > 0 && Math.random() < secondaryChance) {
      const secondRadius = radius * safeRandomInRange(0.7, 1.3);
      const minSecondY = secondRadius;
      const maxSecondY = Math.max(minSecondY, groundY - secondRadius);
      
      let secondPlanetY: number;
      if (positionAbove) {
        const minLower = safeZoneY + safeZoneSize + secondRadius;
        secondPlanetY = safeRandomInRange(Math.min(minLower, maxSecondY), maxSecondY);
      } else {
        const maxUpper = Math.min(safeZoneY - secondRadius, maxSecondY);
        secondPlanetY = safeRandomInRange(minSecondY, maxUpper);
      }
      secondPlanetY = Math.max(minSecondY, Math.min(secondPlanetY, maxSecondY));
      
      const secondPlanet = this.entities.createPlanet(
        this.getSpawnX(radius + 100 + Math.random() * 150),
        secondPlanetY,
        secondRadius,
        this.levelConfig.speeds.secondaryPlanet
      );
      
      this.ensureNoOverlap(secondPlanet);
    }
  }
  
  /**
   * Spawn an orb safely within the playable corridor above ground
   */
  private spawnOrb(): void {
    const radius = safeRandomInRange(12, 18);
    const groundY = this.entities.getGroundY() ?? GAME_HEIGHT;
    
    const defaultMinY = GAME_HEIGHT * 0.2;
    const defaultMaxY = Math.min(GAME_HEIGHT * 0.8, groundY - radius - 10);

    const configuredMinY = this.levelConfig.orbs?.minY;
    const configuredMaxY = this.levelConfig.orbs?.maxY;

    const minY = configuredMinY !== undefined ? configuredMinY : defaultMinY;
    const maxY = Math.min(configuredMaxY !== undefined ? configuredMaxY : defaultMaxY, groundY - radius - 10);

    const orbY = safeRandomInRange(Math.min(minY, maxY), Math.max(minY, maxY));
    
    this.entities.createOrb(
      this.getSpawnX(radius),
      orbY,
      radius,
      this.levelConfig.speeds.orb
    );
  }

  /**
   * Spawn flight content just beyond the viewport, but keep world-space content
   * in the authored world ahead of the astronaut. The camera, not entity motion,
   * then brings it on screen.
   */
  private getSpawnX(offset: number): number {
    const world = this.entities.getWorldDef();
    if (!world) return GAME_WIDTH + offset;

    const astronautX = this.entities.getAstronaut()?.worldX ?? 0;
    if (world.traversal === 'loop') {
      const direction = (this.entities.getAstronaut()?.horizontalVelocity ?? 0) < 0 ? -1 : 1;
      return astronautX + direction * (GAME_WIDTH + offset);
    }
    return Math.min(world.width - offset, Math.max(GAME_WIDTH + offset, astronautX + GAME_WIDTH + offset));
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
