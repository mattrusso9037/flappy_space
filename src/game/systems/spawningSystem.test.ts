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
    });

    expect(spawning.getLevelConfig().spawnInterval).toBe(1800);
    expect(spawning.getLevelConfig().speeds.planet).toBe(2.5);
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

  it('spawns delayed orb deterministically in simulation time without real timers', () => {
    const createOrbSpy = vi.spyOn(entities, 'createOrb');
    // Force Math.random to trigger orb spawn chance (< ORB_SPAWN_CHANCE)
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

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
});
