/** Development-only fixture using the real composition root. Not a production build entry. */
import { Application, Ticker } from 'pixi.js';
import { createFlappySpaceRuntime } from '../game/createFlappySpaceRuntime';
import assetManager from '../game/assetManager';
import { GameEvent } from '../game/eventBus';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { initLogger, LogLevel } from '../utils/logger';
import '../styles/visual-tokens.css';
import './visual-preview.css';

async function setup(): Promise<void> {
  if (!import.meta.env.DEV) return;
  initLogger({ level: LogLevel.WARN });
  const host = document.querySelector<HTMLElement>('#preview')!;
  const status = document.querySelector<HTMLOutputElement>('#status')!;
  await Promise.all([document.fonts.load('400 16px "Space Mono"'), document.fonts.load('700 36px "Space Grotesk"'), assetManager.loadAssets()]);
  const app = new Application();
  await app.init({ background: '#070913', antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
  host.appendChild(app.canvas);
  const runtime = createFlappySpaceRuntime(app);
  runtime.initialize();
  const resize = () => {
    app.renderer.resize(host.clientWidth, host.clientHeight);
    const scale = Math.min(host.clientWidth / GAME_WIDTH, host.clientHeight / GAME_HEIGHT);
    app.stage.scale.set(scale);
    app.stage.position.set((host.clientWidth - GAME_WIDTH * scale) / 2, (host.clientHeight - GAME_HEIGHT * scale) / 2);
    runtime.systems.ui.update(0);
  };
  window.addEventListener('resize', resize);
  resize();
  const scene = () => {
    runtime.reset(); runtime.start(); runtime.pause();
    const entities = runtime.systems.entities;
    const pilot = entities.getAstronaut()!;
    pilot.sprite.position.set(220, 290);
    entities.createPlanet(590, 110, 54, 0);
    entities.createPlanet(660, 480, 66, 0);
    entities.createOrb(440, 300, 18, 0);
    entities.createOrb(720, 260, 14, 0);
    runtime.state.setScore(240);
    runtime.state.collectOrb(); runtime.state.collectOrb();
    runtime.systems.ui.update(0);
    status.value = 'Scene / paused';
  };
  const step = (seconds: number) => {
    runtime.resume(); runtime.onTick({ deltaMS: seconds * 1000 } as Ticker); runtime.pause();
  };
  const actions: Record<string, () => void> = {
    scene,
    thrust: () => { scene(); runtime.systems.entities.getAstronaut()!.flap(); step(0.05); step(0.05); status.value = 'Thrust / paused'; },
    collection: () => { scene(); runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 440, y: 300 }); step(0.18); status.value = 'Collection / paused'; },
    warp: () => {
      scene();
      while (!runtime.state.getState().isLevelComplete) runtime.state.collectOrb();
      runtime.events.emit(GameEvent.ORB_COLLECTED, { x: 440, y: 300 });
      step(0.5); step(0.1); status.value = 'Warp / paused';
    },
    impact: () => { scene(); runtime.resume(); runtime.events.emit(GameEvent.COLLISION_DETECTED, null); runtime.onTick({ deltaMS: 200 } as Ticker); status.value = 'Impact / paused'; },
    step: () => { step(0.1); status.value = 'Step / paused'; },
    play: () => { runtime.resume(); status.value = 'Playing'; },
    pause: () => { runtime.pause(); status.value = 'Paused'; },
  };
  for (const [id, action] of Object.entries(actions)) document.getElementById(id)!.addEventListener('click', action);
  window.addEventListener('pagehide', () => { window.removeEventListener('resize', resize); runtime.dispose(); app.destroy(true, { children: true }); }, { once: true });
  scene();
}
void setup();
