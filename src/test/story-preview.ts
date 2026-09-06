/**
 * Story Preview — dev-only entry point for QA'ing story content directly.
 *
 * Supports:
 *   TYPE dropdown  → Dialogue | In-Engine Cutscene | Video
 *   CONTENT dropdown → populated from production registries
 *   PLAY / RESTART / SKIP buttons
 *
 * Query parameters (auto-play on load):
 *   ?dialogue=<id>
 *   ?cutscene=<id>
 *   ?video=<id>
 *
 * Invalid IDs display a dev-facing error without crashing.
 */
import { Application, Ticker } from 'pixi.js';
import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';

import { createFlappySpaceRuntime } from '../game/createFlappySpaceRuntime';
import assetManager from '../game/assetManager';
import { GameRuntime } from '../game/GameRuntime';
import { CutsceneRunner } from '../game/story/cutscenes/CutsceneRunner';
import { GAME_WIDTH, GAME_HEIGHT } from '../game/config';
import { initLogger, LogLevel } from '../utils/logger';
import { getLogger } from '../utils/logger';

import { getAllDialogues, getDialogue } from '../game/story/dialogue/dialogues';
import { getAllCutscenes, getCutscene } from '../game/story/cutscenes/cutscenes';
import { getAllVideoCutscenes, getVideoCutscene } from '../game/story/video/videoCutscenes';
import { DEFAULT_CAMPAIGN } from '../game/campaign/defaultCampaign';

import { DialogueOverlay } from '../components/story/DialogueOverlay';
import { VideoCutsceneOverlay } from '../components/story/VideoCutsceneOverlay';

import '../styles/visual-tokens.css';
import './story-preview.css';

if (!import.meta.env.DEV) {
  throw new Error('story-preview.ts is a dev-only entry point.');
}

initLogger({ level: LogLevel.WARN });
const logger = getLogger('StoryPreview');

// ── DOM refs ──────────────────────────────────────────────────────────────
const typeSelect = document.querySelector<HTMLSelectElement>('#type-select')!;
const contentSelect = document.querySelector<HTMLSelectElement>('#content-select')!;
const playBtn = document.querySelector<HTMLButtonElement>('#btn-play')!;
const restartBtn = document.querySelector<HTMLButtonElement>('#btn-restart')!;
const skipBtn = document.querySelector<HTMLButtonElement>('#btn-skip')!;
const statusEl = document.querySelector<HTMLOutputElement>('#status')!;
const previewArea = document.querySelector<HTMLElement>('#preview-area')!;
const reactMount = document.querySelector<HTMLElement>('#react-mount')!;
const errorPanel = document.querySelector<HTMLElement>('#error-panel')!;
const errorTitle = document.querySelector<HTMLElement>('#error-title')!;
const errorMessage = document.querySelector<HTMLElement>('#error-message')!;

// ── State ─────────────────────────────────────────────────────────────────
type PreviewType = 'dialogue' | 'cutscene' | 'video';

let pixiApp: Application | null = null;
let runtime: GameRuntime | null = null;
let cutsceneRunner: CutsceneRunner | null = null;
let reactRoot: Root | null = null;
let currentType: PreviewType = 'dialogue';

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

function populateContentDropdown(type: PreviewType): void {
  contentSelect.innerHTML = '';
  let items: Array<{ id: string; label: string }> = [];

  if (type === 'dialogue') {
    items = getAllDialogues().map(d => ({ id: d.id, label: `${d.id} (${d.lines.length} lines)` }));
  } else if (type === 'cutscene') {
    items = getAllCutscenes().map(c => ({ id: c.id, label: `${c.id} (${c.steps.length} steps)` }));
  } else {
    items = getAllVideoCutscenes().map(v => ({ id: v.id, label: v.id }));
  }

  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.label;
    contentSelect.appendChild(opt);
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────

function teardown(): void {
  cutsceneRunner?.skip();
  cutsceneRunner = null;

  reactRoot?.unmount();
  reactRoot = null;
  reactMount.innerHTML = '';

  if (runtime) {
    runtime.dispose();
    runtime = null;
  }
  if (pixiApp) {
    pixiApp.destroy(true, { children: true });
    pixiApp = null;
    previewArea.innerHTML = '';
  }
  previewArea.appendChild(reactMount); // re-attach react mount
}

// ── Pixi bootstrap (reused between cutscene plays) ────────────────────────

async function ensurePixiApp(): Promise<Application> {
  if (pixiApp) return pixiApp;

  const app = new Application();
  await app.init({
    background: '#070913',
    antialias: true,
    resolution: Math.min(devicePixelRatio, 2),
    autoDensity: true,
  });
  previewArea.insertBefore(app.canvas, reactMount);
  pixiApp = app;

  const resize = () => {
    app.renderer.resize(previewArea.clientWidth, previewArea.clientHeight);
    const scale = Math.min(previewArea.clientWidth / GAME_WIDTH, previewArea.clientHeight / GAME_HEIGHT);
    app.stage.scale.set(scale);
    app.stage.position.set(
      (previewArea.clientWidth - GAME_WIDTH * scale) / 2,
      (previewArea.clientHeight - GAME_HEIGHT * scale) / 2
    );
  };
  window.addEventListener('resize', resize);
  resize();
  return app;
}

async function ensureRuntime(): Promise<GameRuntime> {
  const app = await ensurePixiApp();
  if (runtime) return runtime;

  const r = createFlappySpaceRuntime(app);
  r.initialize();

  // Load the first campaign level for environment/stars
  const startDef = DEFAULT_CAMPAIGN.levels[DEFAULT_CAMPAIGN.startingLevelId];
  r.reset(startDef);
  r.start();
  // Don't advance gameplay — just let the world idle (stars, atmosphere)
  r.pause();
  runtime = r;
  return r;
}

// ── Dialogue preview ───────────────────────────────────────────────────────

function playDialogue(id: string): void {
  const def = getDialogue(id);
  if (!def) {
    showError('Unknown Dialogue ID', `No dialogue registered with id <code>"${id}"</code>.<br>Check the dialogue registry.`);
    return;
  }
  hideError();
  setStatus(`Playing dialogue: ${id}`);
  skipBtn.disabled = false;

  const mount = document.createElement('div');
  mount.style.cssText = 'position:absolute;inset:0;';
  reactMount.innerHTML = '';
  reactMount.appendChild(mount);

  reactRoot = createRoot(mount);
  const onComplete = () => {
    setStatus(`Completed: ${id}`);
    skipBtn.disabled = true;
  };
  reactRoot.render(
    createElement(DialogueOverlay, { dialogueId: id, onComplete })
  );
}

// ── In-engine cutscene preview ─────────────────────────────────────────────

async function playCutscene(id: string): Promise<void> {
  const def = getCutscene(id);
  if (!def) {
    showError('Unknown Cutscene ID', `No cutscene registered with id <code>"${id}"</code>.<br>Check the cutscene registry.`);
    return;
  }
  hideError();

  const r = await ensureRuntime();
  // Clear any previous React mount (embedded dialogue)
  reactMount.innerHTML = '';

  setStatus(`Running cutscene: ${id}`);
  skipBtn.disabled = false;

  cutsceneRunner = new CutsceneRunner({
    onComplete: () => {
      r.setCutsceneRunner(null);
      r.systems.rendering.setFadeAlpha(0);
      r.systems.rendering.resetCamera();
      reactMount.innerHTML = '';
      setStatus(`Completed: ${id}`);
      skipBtn.disabled = true;
      cutsceneRunner = null;
    },
    onDialogueStart: (dId) => {
      // Mount embedded dialogue via React
      const mount = document.createElement('div');
      mount.style.cssText = 'position:absolute;inset:0;';
      reactMount.innerHTML = '';
      reactMount.appendChild(mount);
      const root = createRoot(mount);
      root.render(
        createElement(DialogueOverlay, {
          dialogueId: dId,
          onComplete: () => {
            root.unmount();
            reactMount.innerHTML = '';
            cutsceneRunner?.completeDialogue();
          },
        })
      );
    },
    onFadeChange: (alpha) => {
      r.systems.rendering.setFadeAlpha(alpha);
    },
    onCameraChange: (camera) => {
      r.systems.rendering.setCamera(
        camera.x ?? 0,
        camera.y ?? 0,
        camera.zoom ?? 1
      );
    },
    onMusicChange: (musicId) => {
      r.systems.audio.loadMusicTrack(musicId);
      r.systems.audio.startMusic();
    },
  });

  r.setCutsceneRunner(cutsceneRunner);

  // Drive the cutscene via the real Pixi ticker (as GameRuntime.onTick does)
  const tickerCallback = (ticker: Ticker) => {
    if (!cutsceneRunner?.isActive()) {
      pixiApp?.ticker.remove(tickerCallback);
      return;
    }
    const ds = ticker.deltaMS / 1000;
    cutsceneRunner.update(ds);
    r.systems.rendering.updateBackground(ds);
    r.systems.rendering.update(ds);
  };
  pixiApp!.ticker.add(tickerCallback);

  cutsceneRunner.start(def);
  logger.info(`Cutscene preview started: ${id}`);
}

// ── Video preview ─────────────────────────────────────────────────────────

function playVideo(id: string): void {
  const def = getVideoCutscene(id);
  if (!def) {
    showError('Unknown Video ID', `No video cutscene registered with id <code>"${id}"</code>.<br>Check the video registry.`);
    return;
  }
  hideError();
  setStatus(`Playing video: ${id}`);
  skipBtn.disabled = false;

  const mount = document.createElement('div');
  mount.style.cssText = 'position:absolute;inset:0;background:#070913;';
  reactMount.innerHTML = '';
  reactMount.appendChild(mount);

  reactRoot = createRoot(mount);
  const onComplete = () => {
    setStatus(`Completed: ${id} (or video error — see error handling UI)`);
    skipBtn.disabled = true;
  };
  reactRoot.render(
    createElement(VideoCutsceneOverlay, { videoId: id, isMuted: false, onComplete })
  );
}

// ── Play dispatcher ────────────────────────────────────────────────────────

async function play(): Promise<void> {
  teardown();
  const id = contentSelect.value;
  if (!id) { setStatus('No content selected'); return; }

  playBtn.disabled = true;
  restartBtn.disabled = false;
  setStatus('Loading…');

  try {
    if (currentType === 'dialogue') {
      playDialogue(id);
    } else if (currentType === 'cutscene') {
      await playCutscene(id);
    } else {
      playVideo(id);
    }
  } catch (err) {
    showError('Preview Error', String(err instanceof Error ? err.message : err));
    setStatus('Error — see panel');
  } finally {
    playBtn.disabled = false;
  }
}

function skip(): void {
  if (currentType === 'cutscene') {
    cutsceneRunner?.skip();
  } else {
    // dialogue/video — simply dismiss
    reactRoot?.unmount();
    reactMount.innerHTML = '';
    setStatus('Skipped');
    skipBtn.disabled = true;
  }
}

// ── Event wiring ───────────────────────────────────────────────────────────

typeSelect.addEventListener('change', () => {
  currentType = typeSelect.value as PreviewType;
  populateContentDropdown(currentType);
  teardown();
  setStatus('Ready');
  skipBtn.disabled = true;
  restartBtn.disabled = true;
});

playBtn.addEventListener('click', () => { void play(); });
restartBtn.addEventListener('click', () => { void play(); });
skipBtn.addEventListener('click', skip);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') skip();
});

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  await Promise.all([
    assetManager.isLoaded() ? Promise.resolve() : assetManager.loadAssets(),
    document.fonts.load('400 16px "Space Mono"'),
    document.fonts.load('700 32px "Space Grotesk"'),
  ]);

  // Read query params
  const params = new URLSearchParams(window.location.search);
  const qDialogue = params.get('dialogue');
  const qCutscene = params.get('cutscene');
  const qVideo = params.get('video');

  // Determine type from query params
  if (qCutscene !== null) {
    currentType = 'cutscene';
    typeSelect.value = 'cutscene';
  } else if (qVideo !== null) {
    currentType = 'video';
    typeSelect.value = 'video';
  } else {
    currentType = 'dialogue';
    typeSelect.value = 'dialogue';
  }

  populateContentDropdown(currentType);

  // Select the correct content item if query param provided
  const targetId = qCutscene ?? qVideo ?? qDialogue;
  if (targetId) {
    const opt = Array.from(contentSelect.options).find(o => o.value === targetId);
    if (opt) {
      contentSelect.value = targetId;
    } else {
      // ID provided but not found — show error immediately
      const paramName = qCutscene !== null ? 'cutscene' : qVideo !== null ? 'video' : 'dialogue';
      showError(
        `Unknown ${paramName} ID`,
        `The URL parameter <code>?${paramName}=${targetId}</code> does not match any registered content.<br>Check the registry or verify the ID spelling.`
      );
      setStatus(`Error: unknown ${paramName} "${targetId}"`);
      return;
    }
    // Auto-play
    setStatus('Auto-playing from URL…');
    void play();
  } else {
    setStatus('Ready — select content and press PLAY');
  }

  skipBtn.disabled = true;
  restartBtn.disabled = true;
}

window.addEventListener('pagehide', () => { teardown(); }, { once: true });

void init();
