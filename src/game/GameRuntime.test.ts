import { CutsceneRunner } from './story/cutscenes/CutsceneRunner';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { createFlappySpaceRuntime } from './createFlappySpaceRuntime';
import { GameRuntime } from './GameRuntime';
import { GameEvent } from './eventBus';
import { JUMP_VELOCITY } from './config';
import { DEFAULT_CAMPAIGN } from './campaign/defaultCampaign';


describe('GameRuntime & createFlappySpaceRuntime', () => {
  let app: PIXI.Application;

  beforeEach(() => {
    app = new PIXI.Application();
    // Simulate stage and ticker
    app.stage = new PIXI.Container();
    app.ticker = new PIXI.Ticker();
  });

  it('creates a GameRuntime instance with all required systems', () => {
    const runtime = createFlappySpaceRuntime(app);
    expect(runtime).toBeInstanceOf(GameRuntime);
    expect(runtime.app).toBe(app);
    expect(runtime.events).toBeDefined();
    expect(runtime.state).toBeDefined();
    expect(runtime.systems.entities).toBeDefined();
    expect(runtime.systems.physics).toBeDefined();
    expect(runtime.systems.spawning).toBeDefined();
    expect(runtime.systems.rendering).toBeDefined();
    expect(runtime.systems.input).toBeDefined();
    expect(runtime.systems.audio).toBeDefined();
    expect(runtime.systems.ui).toBeDefined();
  });

  it('initializes all systems and registers ticker listener', () => {
    const runtime = createFlappySpaceRuntime(app);
    const tickerAddSpy = vi.spyOn(app.ticker, 'add');

    runtime.initialize();

    expect(tickerAddSpy).toHaveBeenCalled();
    runtime.dispose();
  });

  it('starts the game and emits HIDE_START_PROMPT', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    let hidePromptEmitted = false;
    runtime.events.on(GameEvent.HIDE_START_PROMPT).subscribe(() => {
      hidePromptEmitted = true;
    });

    runtime.start();

    expect(runtime.state.getState().isStarted).toBe(true);
    expect(hidePromptEmitted).toBe(true);
    runtime.dispose();
  });

  it('pauses and resumes without throwing', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.start();

    runtime.pause();
    runtime.resume();

    expect(runtime.state.getState().isStarted).toBe(true);
    runtime.dispose();
  });

  it('resets session and emits SHOW_START_PROMPT', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    let showPromptEmitted = false;
    runtime.events.on(GameEvent.SHOW_START_PROMPT).subscribe(() => {
      showPromptEmitted = true;
    });

    runtime.reset();

    expect(showPromptEmitted).toBe(true);
    expect(runtime.state.getState().score).toBe(0);
    runtime.dispose();
  });

  it('disposes cleanly and removes ticker listener', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    const tickerRemoveSpy = vi.spyOn(app.ticker, 'remove');
    runtime.dispose();

    expect(tickerRemoveSpy).toHaveBeenCalled();
  });

  it('wires entities into input system so jump action flaps runtime astronaut', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    const astronaut = runtime.systems.entities.getAstronaut();
    expect(astronaut).toBeDefined();
    expect(astronaut!.velocity).toBe(0);

    // Simulate jump key (Space)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    // Velocity should have updated to flap jump velocity (JUMP_VELOCITY)
    expect(astronaut!.velocity).toBe(JUMP_VELOCITY);
    runtime.dispose();

  });

  it('wires entities into input system so directional movement updates astronaut velocity', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    const astronaut = runtime.systems.entities.getAstronaut();
    expect(astronaut).toBeDefined();

    // Simulate move right (KeyD)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));

    expect(astronaut!.horizontalVelocity).toBe(5);

    // Simulate move left (KeyA)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));

    expect(astronaut!.horizontalVelocity).toBe(-5);

    runtime.dispose();
  });

  it('handles simulation-time level warp deterministically and emits LEVEL_COMPLETED', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    const levelCompleteEvents: Array<{ level: number; levelId?: string }> = [];
    runtime.events.on(GameEvent.LEVEL_COMPLETE).subscribe(data => {
      levelCompleteEvents.push(data);
    });

    const levelCompletedOutcomes: Array<{ levelId: string; score: number }> = [];
    runtime.events.on(GameEvent.LEVEL_COMPLETED).subscribe(data => {
      levelCompletedOutcomes.push(data);
    });

    // Award all required orbs to trigger level completion
    const required = runtime.state.getState().orbsRequired;
    for (let i = 0; i < required - 1; i++) {
      runtime.state.collectOrb();
    }
    // Final orb triggers completion
    runtime.state.collectOrb();
    runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 100, y: 100 });

    expect(levelCompleteEvents).toHaveLength(1);
    expect(levelCompleteEvents[0]).toEqual({ level: 1, levelId: 'sector-01' });

    // Level state does not increment automatically (GameFlow owns level progression)
    expect(runtime.state.getState().level).toBe(1);
    expect(levelCompletedOutcomes).toHaveLength(0);

    // Advance simulation time by 1.0 second (deltaMS = 1000)
    runtime.onTick({ deltaMS: 1000 } as PIXI.Ticker);

    // Pause the game - ticking while paused should not advance level countdown
    runtime.pause();
    runtime.onTick({ deltaMS: 1000 } as PIXI.Ticker);
    runtime.resume();

    // Advance remaining 1.0 second (total 2.0s)
    runtime.onTick({ deltaMS: 1000 } as PIXI.Ticker);

    // Now LEVEL_COMPLETED outcome event is emitted
    expect(levelCompletedOutcomes).toHaveLength(1);
    expect(levelCompletedOutcomes[0].levelId).toBe('sector-01');

    runtime.dispose();
  });

  it('clears level transition countdown if reset is called during celebration', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    // Trigger level complete
    const required = runtime.state.getState().orbsRequired;
    for (let i = 0; i < required; i++) {
      runtime.state.collectOrb();
    }
    runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 100, y: 100 });

    // Mid-transition reset
    runtime.reset();
    expect(runtime.state.getState().level).toBe(1);

    // Ticking 2 seconds should not cause transition to level 2
    runtime.onTick({ deltaMS: 2000 } as PIXI.Ticker);
    expect(runtime.state.getState().level).toBe(1);

    runtime.dispose();
  });

  it('loads explicit LevelDefinition and configures state, spawning, and presentation', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();

    const customLevel = {
      id: 'custom-sector-99',
      name: 'Deep Nebula 99',
      gameplay: {
        speeds: { planet: 7.2, secondaryPlanet: 6.0, orb: 5.0 },
        spawnInterval: 1200,
        orbsRequired: 25,
        timeLimit: 90000,
        obstacles: {
          minPlanetRadius: 25,
          maxPlanetRadius: 70,
          secondaryPlanetChance: 0.4,
        },
        orbs: {
          spawnChance: 0.6,
        },
        levelNumber: 99,
      },
      presentation: {
        environmentId: 'violet-reach',
        musicId: 'weightless-space',
      },
    };

    runtime.loadLevel(customLevel);

    const state = runtime.state.getState();
    expect(state.level).toBe(99);
    expect(state.levelId).toBe('custom-sector-99');
    expect(state.levelName).toBe('Deep Nebula 99');
    expect(state.orbsRequired).toBe(25);
    expect(state.timeLimit).toBe(90000);

    const spawningConfig = runtime.systems.spawning.getLevelConfig();
    expect(spawningConfig.spawnInterval).toBe(1200);
    expect(spawningConfig.speeds.planet).toBe(7.2);
    expect(spawningConfig.orbs.spawnChance).toBe(0.6);
    expect(spawningConfig.obstacles?.minPlanetRadius).toBe(25);
    expect(spawningConfig.obstacles?.maxPlanetRadius).toBe(70);
    expect(spawningConfig.levelNumber).toBe(99);

    expect(runtime.systems.rendering.getEnvironment().id).toBe('violet-reach');

    runtime.dispose();
  });

  it('emits strongly-typed GAME_OVER event with reason on collision or timeout', () => {
    const runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    runtime.reset();
    runtime.start();

    const gameOverEvents: Array<{ reason?: string } | null> = [];
    runtime.events.on(GameEvent.GAME_OVER).subscribe(data => {
      gameOverEvents.push(data);
    });

    // Trigger collision
    runtime.events.emit(GameEvent.COLLISION_DETECTED, null);

    expect(gameOverEvents).toHaveLength(1);
    expect(gameOverEvents[0]).toEqual({ reason: 'collision' });
    expect(runtime.state.getState().isGameOver).toBe(true);

    runtime.dispose();
  });

  it('freezes all presentation while paused and clears owned layers and tickers', () => {
    const sharedAdd = vi.spyOn(PIXI.Ticker.shared, 'add');
    const runtime = createFlappySpaceRuntime(app);
    const initialTickerCount = app.ticker.count;
    runtime.initialize(); runtime.reset(); runtime.start();
    const star = runtime.systems.entities.getStars()[0];
    runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 100, y: 100 });
    const effects = app.stage.getChildByLabel('flight-effects', true)!;
    const spark = effects.children.find(child => child.visible)!;
    runtime.pause();
    const x = star.graphics.x, sparkX = spark.x, alpha = spark.alpha;
    runtime.onTick({ deltaMS: 500 } as PIXI.Ticker);
    expect(star.graphics.x).toBe(x); expect(spark.x).toBe(sparkX); expect(spark.alpha).toBe(alpha);
    runtime.resume(); runtime.onTick({ deltaMS: 100 } as PIXI.Ticker);
    expect(star.graphics.x).not.toBe(x); expect(spark.alpha).toBeLessThan(alpha);
    runtime.reset(); expect(effects.children.every(child => !child.visible)).toBe(true);
    runtime.dispose();
    expect(app.stage.children).toHaveLength(0);
    expect(app.ticker.count).toBe(initialTickerCount);
    expect(sharedAdd).not.toHaveBeenCalled(); sharedAdd.mockRestore();
  });

  it('isolates multiple concurrent runtimes completely', () => {
    const app1 = new PIXI.Application();
    app1.stage = new PIXI.Container();
    app1.ticker = new PIXI.Ticker();

    const app2 = new PIXI.Application();
    app2.stage = new PIXI.Container();
    app2.ticker = new PIXI.Ticker();

    const runtime1 = createFlappySpaceRuntime(app1);
    const runtime2 = createFlappySpaceRuntime(app2);

    runtime1.initialize();
    runtime2.initialize();

    runtime1.reset();
    runtime2.reset();

    runtime1.start();
    // runtime2 is not started

    expect(runtime1.state.getState().isStarted).toBe(true);
    expect(runtime2.state.getState().isStarted).toBe(false);

    runtime1.state.incrementScore(100);
    expect(runtime1.state.getState().score).toBe(100);
    expect(runtime2.state.getState().score).toBe(0);

    runtime1.dispose();
    runtime2.dispose();
  });
});




it('runs cinematics on the runtime clock without advancing gameplay, and restores HUD on reset', () => {
  const app = new PIXI.Application();
  app.stage = new PIXI.Container();
  app.ticker = new PIXI.Ticker();
  const runtime = createFlappySpaceRuntime(app);
  runtime.initialize();
  runtime.reset();
  runtime.start();
  runtime.pause();
  const onSceneChange = vi.fn();
  const runner = new CutsceneRunner({ onSceneChange });
  runtime.setCutsceneRunner(runner);
  runner.start({ id: 'clock', steps: [{ type: 'scene', duration: 5, scene: { actors: [] } }] });
  const before = runtime.state.getState().timeRemaining;
  const hud = app.stage.getChildByLabel('hud')!;
  expect(hud.visible).toBe(false);
  runtime.onTick({ deltaMS: 500 } as PIXI.Ticker);
  expect(onSceneChange).toHaveBeenLastCalledWith({ actors: [] }, 0.5);
  expect(runtime.state.getState().timeRemaining).toBe(before);
  runtime.pause();
  runtime.onTick({ deltaMS: 500 } as PIXI.Ticker);
  expect(onSceneChange).toHaveBeenLastCalledWith({ actors: [] }, 0.5);
  runtime.resume();
  runtime.onTick({ deltaMS: 500 } as PIXI.Ticker);
  expect(onSceneChange).toHaveBeenLastCalledWith({ actors: [] }, 1);
  runtime.reset();
  expect(hud.visible).toBe(true);
  expect(runtime.getCutsceneRunner()).toBeNull();
  runtime.dispose();
});

it('cleanly transitions between groundless and ground-enabled levels without capability leakage', () => {
  const app = new PIXI.Application();
  app.stage = new PIXI.Container();
  app.ticker = new PIXI.Ticker();
  const runtime = createFlappySpaceRuntime(app);
  runtime.initialize();

  // 1. Load groundless level (sector-01)
  const sector01 = DEFAULT_CAMPAIGN.levels['sector-01'];
  runtime.loadLevel(sector01);
  runtime.start();

  expect(runtime.systems.entities.getGround()).toBeNull();
  expect(runtime.systems.entities.getGroundY()).toBeNull();
  const astro1 = runtime.systems.entities.getAstronaut()!;
  expect(astro1.getGroundY()).toBeNull();
  expect(astro1.getMovementMode()).toBe('flight');
  expect(astro1.getMaxThrustCharges()).toBe(Infinity);
  expect(runtime.systems.spawning.getLevelConfig().obstacles?.enabled).not.toBe(false);

  // Falling to bottom in space is lethal
  astro1.sprite.y = 600 - 25;
  astro1.velocity = 10;
  astro1.update(16.667);
  expect(astro1.dead).toBe(true);

  // 2. Load ground-enabled level (sector-02)
  const sector02 = DEFAULT_CAMPAIGN.levels['sector-02'];
  runtime.loadLevel(sector02);
  runtime.start();

  const ground = runtime.systems.entities.getGround();
  expect(ground).not.toBeNull();
  expect(ground?.height).toBe(80);
  expect(ground?.y).toBe(520);
  expect(ground?.worldWidth).toBe(2400);

  // In ground mode, ground remains stationary during render update
  runtime.systems.rendering.update(0.1);
  expect(ground?.worldWidth).toBe(2400);

  const astro2 = runtime.systems.entities.getAstronaut()!;
  expect(astro2.getGroundY()).toBe(520);
  expect(astro2.getMovementMode()).toBe('ground');
  expect(astro2.getMaxThrustCharges()).toBe(1);
  expect(astro2.getThrustCharges()).toBe(1);
  expect(runtime.systems.spawning.getLevelConfig().obstacles?.enabled).toBe(false);
  expect(runtime.systems.spawning.getLevelConfig().orbs?.minY).toBe(360);
  expect(runtime.systems.spawning.getLevelConfig().orbs?.maxY).toBe(480);

  // Ground movement jump & landing recharge
  expect(astro2.thrust()).toBe(true);
  expect(astro2.getThrustCharges()).toBe(0);
  expect(astro2.thrust()).toBe(false); // Second airborne jump rejected

  // Falling to ground surface lands safely and recharges thrust
  astro2.sprite.y = 520 - 25;
  astro2.velocity = 10;
  astro2.update(16.667);
  expect(astro2.dead).toBe(false);
  expect(astro2.isGrounded).toBe(true);
  expect(astro2.getThrustCharges()).toBe(1);

  // 3. Load groundless level again (sector-04)
  const sector04 = DEFAULT_CAMPAIGN.levels['sector-04'];
  runtime.loadLevel(sector04);
  runtime.start();

  expect(runtime.systems.entities.getGround()).toBeNull();
  expect(runtime.systems.entities.getGroundY()).toBeNull();
  const astro3 = runtime.systems.entities.getAstronaut()!;
  expect(astro3.getGroundY()).toBeNull();
  expect(astro3.getMovementMode()).toBe('flight');
  expect(astro3.getMaxThrustCharges()).toBe(Infinity);
  expect(astro3.getThrustCharges()).toBe(Infinity);
  expect(runtime.systems.spawning.getLevelConfig().obstacles?.enabled).not.toBe(false);

  // Bottom boundary must be lethal again in sector-04
  astro3.sprite.y = 600 - 25;
  astro3.velocity = 10;
  astro3.update(16.667);
  expect(astro3.dead).toBe(true);

  runtime.dispose();
});

it('keeps looping terrain, sky, and thrust aligned beyond both world boundaries and resets to flight', () => {
  const app = new PIXI.Application();
  app.stage = new PIXI.Container();
  app.ticker = new PIXI.Ticker();
  const runtime = createFlappySpaceRuntime(app);
  runtime.initialize();
  runtime.reset(DEFAULT_CAMPAIGN.levels['sector-02']);
  runtime.start();
  const pilot = runtime.systems.entities.getAstronaut()!;
  const camera = runtime.systems.rendering.worldCamera;
  const effects = camera.getChildByLabel('flight-effects')!;
  const ground = runtime.systems.entities.getGround()!;
  const childCount = ground.container.children.length;
  for (const x of [2399, 2401, 7201, -2401]) {
    pilot.worldX = x;
    pilot.sprite.x = x;
    pilot.sprite.y = 480;
    pilot.velocity = 0;
    pilot.rechargeThrust();
    pilot.flap();
    runtime.onTick({ deltaMS: 30 } as PIXI.Ticker);
    expect(pilot.worldX).toBe(x);
    const spark = effects.children.filter(c => c.visible).at(-1)!;
    const position = spark.getGlobalPosition();
    const pilotPosition = pilot.sprite.getGlobalPosition();
    expect(position.x).toBeCloseTo(pilotPosition.x - 12);
    expect(position.y).toBeCloseTo(pilotPosition.y + 13);
    runtime.systems.rendering.setGroundCameraX(x - 536);
    expect(camera.getChildByLabel('atmosphere')!.getGlobalPosition().x).toBe(0);
    expect(camera.getChildByLabel('stars')!.getGlobalPosition().x).toBe(0);
    const bounds = ground.container.getBounds();
    expect(bounds.minX).toBeLessThanOrEqual(0);
    expect(bounds.maxX).toBeGreaterThanOrEqual(800);
    expect(ground.container.children.length).toBe(childCount);
    runtime.systems.ui.reset();
  }
  runtime.reset(DEFAULT_CAMPAIGN.levels['sector-04']);
  expect(camera.x).toBe(0);
  expect(camera.getChildByLabel('atmosphere')!.x).toBe(0);
  expect(camera.getChildByLabel('stars')!.x).toBe(0);
  expect(runtime.systems.entities.getGround()).toBeNull();
  expect(effects.children.every(c => !c.visible)).toBe(true);
  runtime.dispose();
});

it.each([800, 3200])('uses an authored %i pixel loop and bounds spawned content in either direction', (width) => {
  const app = new PIXI.Application();
  app.stage = new PIXI.Container();
  app.ticker = new PIXI.Ticker();
  const runtime = createFlappySpaceRuntime(app);
  runtime.initialize();
  const level = structuredClone(DEFAULT_CAMPAIGN.levels['sector-02']);
  level.gameplay.world = { width, traversal: 'loop' };
  level.gameplay.scenarios = [];
  level.gameplay.orbs.spawnChance = 1;
  runtime.reset(level);
  runtime.start();
  const entities = runtime.systems.entities;
  const pilot = entities.getAstronaut()!;
  pilot.sprite.y = 480;
  for (const direction of [1, -1]) {
    pilot.worldX = width * 3 * direction;
    pilot.sprite.x = pilot.worldX;
    if (direction > 0) pilot.moveRight(); else pilot.moveLeft();
    const old = entities.createOrb(pilot.worldX - direction * 2400, 400, 12, 0);
    runtime.systems.physics.update(1 / 60);
    expect(entities.getOrbs()).not.toContain(old);
    runtime.state.updateTime(3000);
    runtime.systems.spawning.update(3, runtime.state.getState());
    const spawned = entities.getOrbs().at(-1)!;
    expect((spawned.x - pilot.worldX) * direction).toBeGreaterThan(800);
    const cameraX = pilot.worldX - 536;
    runtime.systems.rendering.setGroundCameraX(cameraX);
    const ground = entities.getGround()!;
    expect(ground.worldWidth).toBe(width);
    expect(ground.container.x).toBe(Math.floor(cameraX / width) * width);
    expect(ground.container.getBounds().minX).toBeLessThanOrEqual(0);
    expect(ground.container.getBounds().maxX).toBeGreaterThanOrEqual(800);
  }
  runtime.dispose();
});
