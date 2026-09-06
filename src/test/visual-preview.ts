/** Development-only fixture using the real composition root. Not a production build entry. */
import { RELAY_STATIONS, replayRelayStation } from './relayWalkthrough';
import { Application, Ticker } from 'pixi.js';
import { createFlappySpaceRuntime } from '../game/createFlappySpaceRuntime';
import assetManager from '../game/assetManager';
import { GameEvent } from '../game/eventBus';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { DEFAULT_CAMPAIGN } from '../game/campaign/defaultCampaign';
import { initLogger, LogLevel } from '../utils/logger';
import '../styles/visual-tokens.css';
import './visual-preview.css';

async function setup(): Promise<void> {
  if (!import.meta.env.DEV) return;
  initLogger({ level: LogLevel.WARN });
  const host = document.querySelector<HTMLElement>('#preview')!;
  const status = document.querySelector<HTMLOutputElement>('#status')!;
  const levelSelect = document.querySelector<HTMLSelectElement>('#level-select')!;

  // Populate level selector with all campaign levels
  for (const level of Object.values(DEFAULT_CAMPAIGN.levels)) {
    const opt = document.createElement('option');
    opt.value = level.id;
    opt.textContent = `${level.name} (${level.id})`;
    levelSelect.appendChild(opt);
  }

  // Parse query parameter ?level=
  const urlParams = new URLSearchParams(window.location.search);
  const queryLevel = urlParams.get('level');
  if (queryLevel && DEFAULT_CAMPAIGN.levels[queryLevel]) {
    levelSelect.value = queryLevel;
  }

  await Promise.all([
    document.fonts.load('400 16px "Space Mono"'),
    document.fonts.load('700 36px "Space Grotesk"'),
    assetManager.loadAssets(),
  ]);

  const app = new Application();
  await app.init({
    background: '#070913',
    antialias: true,
    resolution: Math.min(devicePixelRatio, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const runtime = createFlappySpaceRuntime(app);
  runtime.initialize();

  const resize = () => {
    app.renderer.resize(host.clientWidth, host.clientHeight);
    const scale = Math.min(host.clientWidth / GAME_WIDTH, host.clientHeight / GAME_HEIGHT);
    app.stage.scale.set(scale);
    app.stage.position.set(
      (host.clientWidth - GAME_WIDTH * scale) / 2,
      (host.clientHeight - GAME_HEIGHT * scale) / 2
    );
    runtime.systems.ui.update(0);
  };
  window.addEventListener('resize', resize);
  resize();

  const getSelectedLevel = () => {
    const id = levelSelect.value;
    return DEFAULT_CAMPAIGN.levels[id] ?? DEFAULT_CAMPAIGN.levels[DEFAULT_CAMPAIGN.startingLevelId];
  };

  const loadLevel = () => {
    const def = getSelectedLevel();
    // A level load starts a fresh walkthrough, so station progression cannot leak
    // between level selections or repeated preview sessions.
    relayStation = 0;
    runtime.reset(def);
    runtime.start();
    status.value = `Playing: ${def.name}`;
  };

  const scene = () => {
    const def = getSelectedLevel();
    runtime.reset(def);
    runtime.start();
    runtime.pause();
    const entities = runtime.systems.entities;
    const pilot = entities.getAstronaut()!;
    pilot.sprite.position.set(220, 290);
    entities.createPlanet(590, 110, 54, 0);
    entities.createPlanet(660, 480, 66, 0);
    entities.createOrb(440, 300, 18, 0);
    entities.createOrb(720, 260, 14, 0);
    runtime.state.setScore(240);
    runtime.state.collectOrb();
    runtime.state.collectOrb();
    runtime.systems.ui.update(0);
    status.value = `Scene (${def.name}) / paused`;
  };

  const step = (seconds: number) => {
    runtime.resume();
    runtime.onTick({ deltaMS: seconds * 1000 } as Ticker);
    runtime.pause();
  };

  const traverse = (direction: 'left' | 'right') => {
    const pilot = runtime.systems.entities.getAstronaut();
    if (!pilot || pilot.getMovementMode() !== 'ground') return;
    const start = pilot.worldX;
    runtime.resume();
    for (let frame = 0; frame < 600 && Math.abs(pilot.worldX - start) < GAME_WIDTH; frame++) {
      if (direction === 'right') pilot.moveRight(); else pilot.moveLeft();
      runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
    }
    runtime.pause();
    status.value = `Traversal / world X ${pilot.worldX.toFixed(0)} / camera X ${(-runtime.systems.rendering.worldCamera.x).toFixed(0)}`;
  };

  let relayStation = 0;
  const actions: Record<string, () => void> = {
    'load-level': loadLevel,
    'relay-route': () => {
      if (getSelectedLevel().id !== 'sector-03') {
        status.value = 'Select The Relay Vault first'; return;
      }
      if (relayStation === 0) { runtime.reset(getSelectedLevel()); runtime.start(); }
      try {
        const station = replayRelayStation(runtime, relayStation);
        status.value = `${station} / ${runtime.state.getState().orbsCollected}/8 recovered`;
        relayStation = (relayStation + 1) % RELAY_STATIONS.length;
      } catch (error) {
        status.value = error instanceof Error ? error.message : 'Replay failed';
        relayStation = 0;
      }
    },
    'traverse-right': () => traverse('right'),
    'traverse-left': () => traverse('left'),
    'traverse-thrust': () => {
      runtime.systems.entities.getAstronaut()?.flap();
      step(0.05);
      status.value = 'Traversal thrust / paused';
    },
    'shovel-puzzle': () => {
      const def = getSelectedLevel();
      const plug = def.gameplay.terrainBlocks?.find(block => block.diggable);
      if (!plug) { status.value = 'Select a level with diggable terrain'; return; }
      runtime.reset(def); runtime.start();
      const pilot = runtime.systems.entities.getAstronaut()!;
      pilot.worldX = pilot.sprite.x = plug.bounds.x - 60;
      pilot.sprite.y = runtime.systems.entities.getGroundY()! - 25;
      pilot.velocity = pilot.horizontalVelocity = 0;
      pilot.isGrounded = true;
      runtime.systems.tools.select('shovel');
      for (let frame = 0; frame < 30; frame++) {
        pilot.moveRight(); runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      }
      runtime.pause();
      status.value = `Blocked / X ${pilot.worldX.toFixed(0)} / blocks ${runtime.systems.entities.getTerrainBlocks().length}`;
    },
    'shovel-cross': () => {
      runtime.resume();
      const result = runtime.systems.tools.use();
      const pilot = runtime.systems.entities.getAstronaut()!;
      for (let frame = 0; frame < 60; frame++) {
        pilot.moveRight(); runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      }
      runtime.pause();
      status.value = `Shovel ${result} / X ${pilot.worldX.toFixed(0)} / blocks ${runtime.systems.entities.getTerrainBlocks().length}`;
    },
    'grapple-puzzle': () => {
      const def = getSelectedLevel();
      const anchor = def.gameplay.tools?.grappleHook?.anchors[0];
      if (!anchor) { status.value = 'Select a level with grapple anchors'; return; }
      runtime.reset(def); runtime.start();
      const pilot = runtime.systems.entities.getAstronaut()!;
      pilot.worldX = pilot.sprite.x = anchor.x - 300;
      pilot.sprite.y = runtime.systems.entities.getGroundY()! - 25;
      pilot.velocity = pilot.horizontalVelocity = 0;
      pilot.isGrounded = true;
      runtime.systems.tools.select('grapple-hook');
      runtime.systems.tools.use();
      for (let frame = 0; frame < 20; frame++) runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      runtime.pause();
      status.value = `Grapple / attached ${!!runtime.systems.tools.getAttachment()} / Y ${pilot.sprite.y.toFixed(0)}`;
    },
    'grapple-reward': () => {
      runtime.resume();
      for (let frame = 0; frame < 45; frame++) runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      runtime.systems.tools.remove();
      runtime.pause();
      status.value = `Grapple / collected ${runtime.state.getState().orbsCollected} / released ${!runtime.systems.tools.getAttachment()}`;
    },
    'wall-puzzle': () => {
      const def = getSelectedLevel();
      const target = def.gameplay.orbs.placements?.[0];
      const wall = def.gameplay.tools?.wallBuilder;
      if (!target || !wall) { status.value = 'Select a level with tools and an authored pickup'; return; }
      runtime.reset(def); runtime.start();
      const pilot = runtime.systems.entities.getAstronaut()!;
      pilot.worldX = pilot.sprite.x = target.x - wall.width - 33;
      pilot.sprite.y = runtime.systems.entities.getGroundY()! - 25;
      pilot.isGrounded = true;
      runtime.systems.tools.use();
      pilot.thrust();
      for (let frame = 0; frame < 20; frame++) runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      pilot.moveRight();
      for (let frame = 0; frame < 110; frame++) runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      runtime.pause();
      status.value = `Panel landing / grounded ${pilot.isGrounded} / Y ${pilot.sprite.y.toFixed(0)} / walls ${runtime.systems.entities.getWalls().length}`;
    },
    'wall-reward': () => {
      runtime.resume();
      runtime.systems.entities.getAstronaut()?.thrust();
      for (let frame = 0; frame < 55; frame++) runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
      runtime.pause();
      status.value = `Panel jump / collected ${runtime.state.getState().orbsCollected} / score ${runtime.state.getState().score}`;
    },
    scene,
    thrust: () => {
      scene();
      runtime.systems.entities.getAstronaut()!.flap();
      step(0.05);
      step(0.05);
      status.value = 'Thrust / paused';
    },
    collection: () => {
      scene();
      runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 440, y: 300 });
      step(0.18);
      status.value = 'Collection / paused';
    },
    warp: () => {
      scene();
      while (!runtime.state.getState().isLevelComplete) runtime.state.collectOrb();
      runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 440, y: 300 });
      step(0.5);
      step(0.1);
      status.value = 'Warp / paused';
    },
    impact: () => {
      scene();
      runtime.resume();
      runtime.events.emit(GameEvent.COLLISION_DETECTED, null);
      runtime.onTick({ deltaMS: 200 } as Ticker);
      status.value = 'Impact / paused';
    },
    step: () => {
      step(0.1);
      status.value = 'Step / paused';
    },
    play: () => {
      runtime.resume();
      status.value = 'Playing';
    },
    pause: () => {
      runtime.pause();
      status.value = 'Paused';
    },
    'toggle-debug': () => {
      const active = runtime.state.toggleDebugMode();
      status.value = `Debug mode: ${active ? 'ON' : 'OFF'}`;
    },
  };

  const toggleDebugBtn = document.querySelector<HTMLButtonElement>('#toggle-debug');
  runtime.state.select(s => s.debugMode).subscribe(debugMode => {
    if (toggleDebugBtn) {
      toggleDebugBtn.textContent = `Debug: ${debugMode ? 'ON' : 'OFF'}`;
    }
  });

  for (const [id, action] of Object.entries(actions)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', action);
  }

  levelSelect.addEventListener('change', () => {
    loadLevel();
  });

  window.addEventListener(
    'pagehide',
    () => {
      window.removeEventListener('resize', resize);
      runtime.dispose();
      app.destroy(true, { children: true });
    },
    { once: true }
  );

  if (queryLevel && DEFAULT_CAMPAIGN.levels[queryLevel]) {
    loadLevel();
  } else {
    scene();
  }
}

void setup();
