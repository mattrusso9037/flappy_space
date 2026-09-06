import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { SpawningSystem } from './spawningSystem';
import { EntitySystem } from './entitySystem';
import { GameStateService } from '../gameStateService';
import { LEVELS } from '../config';

describe('SpawningSystem', () => {
  let mockApp: PIXI.Application;
  let entities: EntitySystem;
  let state: GameStateService;
  let spawning: SpawningSystem;

  beforeEach(() => {
    mockApp = {
      stage: new PIXI.Container(),
    } as unknown as PIXI.Application;

    entities = new EntitySystem(mockApp);
    entities.initialize(mockApp);
    state = new GameStateService();
    spawning = new SpawningSystem(entities, state);
    spawning.initialize();
  });

  afterEach(() => {
    spawning.dispose();
    entities.dispose();
  });

  it('initializes and can reset spawning state', () => {
    expect(() => spawning.resetSpawning()).not.toThrow();
  });

  it('updates level configuration', () => {
    spawning.setLevelConfig({
      speeds: { planet: 2.5, secondaryPlanet: 2.0, orb: 1.8 },
      spawnInterval: 1800,
      orbSpawnChance: 0.8,
      obstacles: {
        minPlanetRadius: 25,
        maxPlanetRadius: 55,
        secondaryPlanetChance: 0.2,
      },
    });

    const config = spawning.getLevelConfig();
    expect(config.spawnInterval).toBe(1800);
    expect(config.speeds.planet).toBe(2.5);
    expect(config.orbSpawnChance).toBe(0.8);
    expect(config.obstacles?.minPlanetRadius).toBe(25);
    expect(config.obstacles?.maxPlanetRadius).toBe(55);
    expect(config.obstacles?.secondaryPlanetChance).toBe(0.2);
  });

  it('initializes level config from LEVELS array via initializeLevel', () => {
    spawning.initializeLevel(2);
    expect(spawning.getLevelConfig().spawnInterval).toBe(LEVELS[1].spawnInterval);
    expect(spawning.getLevelConfig().speeds.planet).toBe(LEVELS[1].speeds.planet);
  });

  it('skips spawning updates when game is not started', () => {
    const createPlanetSpy = vi.spyOn(entities, 'createPlanet');
    spawning.update(0.016, state.getState());

    expect(createPlanetSpy).not.toHaveBeenCalled();
  });

  it('spawns first obstacle when game is started and time exceeds initial delay threshold', () => {
    const createPlanetSpy = vi.spyOn(entities, 'createPlanet');

    state.startGame();
    state.updateTime(2000);

    spawning.update(0.016, state.getState());

    expect(createPlanetSpy).toHaveBeenCalled();
  });

  it('spawns delayed orb deterministically governed by level orbSpawnChance', () => {
    const createOrbSpy = vi.spyOn(entities, 'createOrb');
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    spawning.setLevelConfig({ orbSpawnChance: 0.5 });
    state.startGame();
    state.updateTime(2000);
    // Spawn first obstacle
    spawning.update(0.016, state.getState());

    // Advance time past spawnInterval to trigger second obstacle and schedule orb
    const interval = spawning.getLevelConfig().spawnInterval;
    state.updateTime(interval + 100);
    spawning.update(0.016, state.getState());

    // Orb should not have spawned immediately (delayed by interval * 0.4)
    expect(createOrbSpy).not.toHaveBeenCalled();

    // Advance simulation time by delay
    const delaySeconds = (interval * 0.4) / 1000;
    spawning.update(delaySeconds + 0.05, state.getState());

    // Now orb should be spawned
    expect(createOrbSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('never spawns an orb when orbSpawnChance is 0', () => {
    const createOrbSpy = vi.spyOn(entities, 'createOrb');
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // Very low random

    spawning.setLevelConfig({ orbSpawnChance: 0.0 });
    state.startGame();
    state.updateTime(2000);
    spawning.update(0.016, state.getState());

    const interval = spawning.getLevelConfig().spawnInterval;
    state.updateTime(interval + 100);
    spawning.update(0.016, state.getState());

    // Even after advancing past the delay threshold, orb should NOT spawn
    const delaySeconds = (interval * 0.4) / 1000;
    spawning.update(delaySeconds + 0.05, state.getState());

    expect(createOrbSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('spawns obstacles using explicit obstacles radius configuration without depending on levelNumber', () => {
    const createPlanetSpy = vi.spyOn(entities, 'createPlanet');

    // Configure explicit obstacle bounds and an arbitrary levelNumber
    spawning.setLevelConfig({
      obstacles: {
        minPlanetRadius: 30,
        maxPlanetRadius: 30, // Fixed radius to test exact size
        secondaryPlanetChance: 0,
      },
      levelNumber: 99, // Should NOT affect obstacle radius
    });

    state.startGame();
    state.updateTime(2000);
    spawning.update(0.016, state.getState());

    expect(createPlanetSpy).toHaveBeenCalled();
    const passedRadius = createPlanetSpy.mock.calls[0][2];
    expect(passedRadius).toBe(30);

    // Test with levelNumber: 1 and same config -> behaves identically
    createPlanetSpy.mockClear();
    spawning.resetSpawning();
    spawning.setLevelConfig({
      obstacles: {
        minPlanetRadius: 30,
        maxPlanetRadius: 30,
        secondaryPlanetChance: 0,
      },
      levelNumber: 1,
    });

    state.updateTime(2000);
    spawning.update(0.016, state.getState());
    expect(createPlanetSpy.mock.calls[0][2]).toBe(30);
  });
});
