/**
 * Sprite Animation Preview — dev-only entry point for visual QA of animated sprites.
 *
 * Supports:
 *   ASSET dropdown     → populated from registered sprite definitions
 *   ANIMATION dropdown → populated from the selected asset's animation states
 *   FPS input          → dynamically controls animation playback rate
 *   PLAY / PAUSE / RESTART buttons
 *   HITBOX toggle      → shows logical collision envelope independent of visual frame
 *   GRID toggle        → shows alignment axes and center crosshair
 *
 * Query parameters:
 *   ?asset=<id>
 *   ?animation=<state>
 */

import { Application, AnimatedSprite, Container, Graphics, Sprite, Texture } from 'pixi.js';
import assetManager from '../game/assetManager';
import { getAllSpriteAnimations, getSpriteAnimation } from '../game/visuals/spriteAnimations';
import { SpriteAssetDefinition } from '../game/visuals/spriteAnimationTypes';
import { INK } from '../game/visuals/tokens';
import { initLogger, LogLevel, getLogger } from '../utils/logger';

import '../styles/visual-tokens.css';
import './sprite-preview.css';

if (!import.meta.env.DEV) {
  throw new Error('sprite-preview.ts is a dev-only entry point.');
}

initLogger({ level: LogLevel.WARN });
const logger = getLogger('SpritePreview');

// ── DOM refs ──────────────────────────────────────────────────────────────
const assetSelect = document.querySelector<HTMLSelectElement>('#asset-select')!;
const animationSelect = document.querySelector<HTMLSelectElement>('#animation-select')!;
const fpsInput = document.querySelector<HTMLInputElement>('#fps-input')!;
const playBtn = document.querySelector<HTMLButtonElement>('#btn-play')!;
const pauseBtn = document.querySelector<HTMLButtonElement>('#btn-pause')!;
const restartBtn = document.querySelector<HTMLButtonElement>('#btn-restart')!;
const toggleHitbox = document.querySelector<HTMLInputElement>('#toggle-hitbox')!;
const toggleGrid = document.querySelector<HTMLInputElement>('#toggle-grid')!;
const statusEl = document.querySelector<HTMLOutputElement>('#status')!;
const previewArea = document.querySelector<HTMLElement>('#preview-area')!;
const frameCounterEl = document.querySelector<HTMLElement>('#frame-counter')!;
const stateNameEl = document.querySelector<HTMLElement>('#state-name')!;
const loopIndicatorEl = document.querySelector<HTMLElement>('#loop-indicator')!;
const hitboxSizeEl = document.querySelector<HTMLElement>('#hitbox-size')!;
const errorPanel = document.querySelector<HTMLElement>('#error-panel')!;
const errorTitle = document.querySelector<HTMLElement>('#error-title')!;
const errorMessage = document.querySelector<HTMLElement>('#error-message')!;

// ── State ─────────────────────────────────────────────────────────────────
let pixiApp: Application | null = null;
let currentSprite: AnimatedSprite | Sprite | null = null;
let gridGraphics: Graphics | null = null;
let hitboxGraphics: Graphics | null = null;
let centerContainer: Container | null = null;
let currentDefinition: SpriteAssetDefinition | null = null;
let currentAnimationKey = 'idle';

// ── Helpers ───────────────────────────────────────────────────────────────
function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

function showError(title: string, message: string): void {
  errorTitle.textContent = title;
  errorMessage.innerHTML = message;
  errorPanel.classList.remove('hidden');
}

function hideError(): void {
  errorPanel.classList.add('hidden');
}

function populateAssetDropdown(): void {
  assetSelect.innerHTML = '';
  const assets = getAllSpriteAnimations();
  for (const asset of assets) {
    const opt = document.createElement('option');
    opt.value = asset.id;
    opt.textContent = `${asset.name} (${asset.id})`;
    assetSelect.appendChild(opt);
  }
}

function populateAnimationDropdown(def: SpriteAssetDefinition): void {
  animationSelect.innerHTML = '';
  for (const animKey of Object.keys(def.animations)) {
    const opt = document.createElement('option');
    opt.value = animKey;
    const anim = def.animations[animKey];
    opt.textContent = `${animKey} (${anim.frames.length}f @ ${anim.fps}fps${anim.loop ? ', loop' : ''})`;
    animationSelect.appendChild(opt);
  }
}

// ── Pixi Setup ────────────────────────────────────────────────────────────
async function ensurePixiApp(): Promise<Application> {
  if (pixiApp) return pixiApp;

  const app = new Application();
  await app.init({
    background: '#070913',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  previewArea.appendChild(app.canvas);
  pixiApp = app;

  centerContainer = new Container();
  gridGraphics = new Graphics();
  hitboxGraphics = new Graphics();

  app.stage.addChild(gridGraphics);
  app.stage.addChild(centerContainer);
  app.stage.addChild(hitboxGraphics);

  const resize = () => {
    const w = previewArea.clientWidth;
    const h = previewArea.clientHeight;
    app.renderer.resize(w, h);
    if (centerContainer) {
      centerContainer.position.set(w / 2, h / 2);
    }
    drawGrid();
    drawHitbox();
  };

  window.addEventListener('resize', resize);
  resize();

  return app;
}

function drawGrid(): void {
  if (!gridGraphics || !pixiApp) return;
  gridGraphics.clear();
  if (!toggleGrid.checked) return;

  const w = pixiApp.screen.width;
  const h = pixiApp.screen.height;
  const cx = w / 2;
  const cy = h / 2;

  // Background coordinate grid lines
  for (let x = cx % 40; x < w; x += 40) {
    gridGraphics.moveTo(x, 0).lineTo(x, h).stroke({ color: 0x0e182e, width: 1 });
  }
  for (let y = cy % 40; y < h; y += 40) {
    gridGraphics.moveTo(0, y).lineTo(w, y).stroke({ color: 0x0e182e, width: 1 });
  }

  // Crosshairs at sprite center
  gridGraphics.moveTo(cx - 60, cy).lineTo(cx + 60, cy).stroke({ color: 0x174957, width: 1 });
  gridGraphics.moveTo(cx, cy - 60).lineTo(cx, cy + 60).stroke({ color: 0x174957, width: 1 });
  gridGraphics.circle(cx, cy, 4).stroke({ color: INK.cyan, width: 1 });
}

function drawHitbox(): void {
  if (!hitboxGraphics || !pixiApp || !currentDefinition) return;
  hitboxGraphics.clear();
  if (!toggleHitbox.checked) return;

  const dims = currentDefinition.collisionDimensions ?? { width: 35, height: 35 };
  const cx = pixiApp.screen.width / 2;
  const cy = pixiApp.screen.height / 2;

  // Hitbox rectangle centered on anchor (0.5, 0.5)
  hitboxGraphics
    .rect(cx - dims.width / 2, cy - dims.height / 2, dims.width, dims.height)
    .stroke({ color: INK.hazard, width: 1.5 });
}

// ── Sprite Display & Animation Setup ──────────────────────────────────────
function renderActiveSprite(): void {
  if (!centerContainer) return;
  hideError();

  if (currentSprite) {
    if (currentSprite instanceof AnimatedSprite) {
      currentSprite.stop();
    }
    centerContainer.removeChild(currentSprite);
    currentSprite.destroy();
    currentSprite = null;
  }

  if (!currentDefinition) return;

  const animDef = currentDefinition.animations[currentAnimationKey];
  if (!animDef) {
    showError('Animation Not Found', `State "${currentAnimationKey}" not defined for asset "${currentDefinition.id}".`);
    return;
  }

  stateNameEl.textContent = currentAnimationKey;
  loopIndicatorEl.textContent = String(animDef.loop);
  const dims = currentDefinition.collisionDimensions ?? { width: 35, height: 35 };
  hitboxSizeEl.textContent = `${dims.width} × ${dims.height}`;

  // Try to load animation frames from spritesheet
  const frames = assetManager.getAnimationFrames(currentDefinition.spritesheetAsset, currentAnimationKey);

  if (frames.length > 0) {
    const animSprite = new AnimatedSprite(frames);
    animSprite.anchor.set(0.5);
    animSprite.loop = animDef.loop;
    const targetFps = parseFloat(fpsInput.value) || animDef.fps || 8;
    animSprite.animationSpeed = targetFps / 60;

    animSprite.onFrameChange = (frame) => {
      frameCounterEl.textContent = `${frame + 1} / ${frames.length}`;
    };

    animSprite.onComplete = () => {
      setStatus(`Animation completed: ${currentAnimationKey}`);
    };

    animSprite.play();
    currentSprite = animSprite;
    centerContainer.addChild(animSprite);

    frameCounterEl.textContent = `1 / ${frames.length}`;
    setStatus(`Playing "${currentAnimationKey}" (${frames.length} frames @ ${targetFps} FPS)`);
    playBtn.disabled = true;
    pauseBtn.disabled = false;
  } else {
    // Fallback when spritesheet is not loaded or frames are missing
    // Try to display static base texture
    const texture = assetManager.getTexture(currentDefinition.spritesheetAsset);
    const sprite = new Sprite(texture !== Texture.WHITE ? texture : Texture.WHITE);
    sprite.anchor.set(0.5);
    sprite.width = 50;
    sprite.height = 50;

    currentSprite = sprite;
    centerContainer.addChild(sprite);

    frameCounterEl.textContent = '1 / 1 (static)';
    setStatus(`Static preview: Spritesheet "${currentDefinition.spritesheetAsset}" atlas not yet loaded`);
    playBtn.disabled = true;
    pauseBtn.disabled = true;
  }

  drawHitbox();
}

// ── Controls Wiring ───────────────────────────────────────────────────────
assetSelect.addEventListener('change', () => {
  const def = getSpriteAnimation(assetSelect.value);
  if (!def) return;
  currentDefinition = def;
  populateAnimationDropdown(def);
  currentAnimationKey = def.defaultAnimation || Object.keys(def.animations)[0] || 'idle';
  animationSelect.value = currentAnimationKey;
  const anim = def.animations[currentAnimationKey];
  if (anim) {
    fpsInput.value = String(anim.fps);
  }
  renderActiveSprite();
});

animationSelect.addEventListener('change', () => {
  currentAnimationKey = animationSelect.value;
  if (currentDefinition?.animations[currentAnimationKey]) {
    fpsInput.value = String(currentDefinition.animations[currentAnimationKey].fps);
  }
  renderActiveSprite();
});

fpsInput.addEventListener('input', () => {
  const fps = parseFloat(fpsInput.value);
  if (currentSprite instanceof AnimatedSprite && fps > 0) {
    currentSprite.animationSpeed = fps / 60;
    setStatus(`Updated speed to ${fps} FPS`);
  }
});

playBtn.addEventListener('click', () => {
  if (currentSprite instanceof AnimatedSprite) {
    currentSprite.play();
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    setStatus(`Playing "${currentAnimationKey}"`);
  }
});

pauseBtn.addEventListener('click', () => {
  if (currentSprite instanceof AnimatedSprite) {
    currentSprite.stop();
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    setStatus(`Paused on frame ${currentSprite.currentFrame + 1}`);
  }
});

restartBtn.addEventListener('click', () => {
  if (currentSprite instanceof AnimatedSprite) {
    currentSprite.gotoAndPlay(0);
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    setStatus(`Restarted "${currentAnimationKey}"`);
  }
});

toggleHitbox.addEventListener('change', () => {
  drawHitbox();
});

toggleGrid.addEventListener('change', () => {
  drawGrid();
});

// ── Init ───────────────────────────────────────────────────────────────────
async function init(): Promise<void> {
  await ensurePixiApp();

  try {
    if (!assetManager.isLoaded()) {
      await assetManager.loadAssets();
    }
  } catch (err) {
    logger.warn('Asset loading warning:', err);
  }

  populateAssetDropdown();

  // Read URL query params
  const params = new URLSearchParams(window.location.search);
  const qAsset = params.get('asset') || 'astronaut';
  const qAnimation = params.get('animation');

  const def = getSpriteAnimation(qAsset) || getAllSpriteAnimations()[0];
  if (def) {
    currentDefinition = def;
    assetSelect.value = def.id;
    populateAnimationDropdown(def);

    if (qAnimation && def.animations[qAnimation]) {
      currentAnimationKey = qAnimation;
    } else {
      currentAnimationKey = def.defaultAnimation || Object.keys(def.animations)[0] || 'idle';
    }
    animationSelect.value = currentAnimationKey;
    if (def.animations[currentAnimationKey]) {
      fpsInput.value = String(def.animations[currentAnimationKey].fps);
    }
    renderActiveSprite();
  } else {
    showError('No Assets Found', 'No sprite animations registered in the catalog.');
  }
}

void init();
