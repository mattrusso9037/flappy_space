import { CinematicSceneRenderer } from '../story/cutscenes/CinematicSceneRenderer';
import { CinematicScene } from '../story/cutscenes/sceneTypes';
import * as PIXI from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { GameStateService } from '../gameStateService';
import { ASTRONAUT, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { DEPTH, INK, MOTION } from '../visuals/tokens';
import { EnvironmentDefinition, EnvironmentId } from '../environments/environmentTypes';
import { DEEP_NEBULA, resolveEnvironment } from '../environments/environments';

/**
 * Owns atmosphere, parallax, warp and presentation transforms. No extra ticker.
 *
 * ## Cinematic Camera Architecture
 *
 * A `worldCamera` container sits between `app.stage` and the world layers
 * (atmosphere, stars, world entities, pilot). Camera steps transform only this
 * container, leaving the HUD, fade overlay, and debug graphics untouched.
 *
 * Container hierarchy:
 *   app.stage
 *     ├── worldCamera         (camera transforms applied here)
 *     │     ├── atmosphere    (nebula + bg rect)
 *     │     ├── starLayer     (EntitySystem stars)
 *     │     ├── worldLayer    (EntitySystem planets/orbs)
 *     │     ├── pilotLayer    (EntitySystem astronaut)
 *     │     └── effects       (UISystem FlightEffects, world-space)
 *     ├── HUD                 (UISystem — viewport-space, outside camera)
 *     ├── debugGraphics       (RenderSystem — outside camera)
 *     └── fadeGraphics        (RenderSystem — full-screen fade, outside camera)
 *
 * ## Camera Semantics
 *   x    — horizontal world offset in game pixels. Positive x shifts world right (camera pans left).
 *   y    — vertical world offset in game pixels. Positive y shifts world down (camera pans up).
 *   zoom — scale from canvas center. zoom:1 is neutral. zoom>1 zooms in. Defaults: x=0, y=0, zoom=1.
 */
export class RenderSystem {
  private app: PIXI.Application | null;
  private atmosphere = new PIXI.Container({ label: 'atmosphere', zIndex: DEPTH.atmosphere, eventMode: 'none' });
  private debugGraphics = new PIXI.Graphics({ zIndex: DEPTH.debug });
  private fadeGraphics = new PIXI.Graphics({ zIndex: DEPTH.hud + 5, eventMode: 'none' });
  /**
   * World-space camera container. Camera steps transform this container only.
   * HUD, fade, and debug are children of app.stage — outside this container.
   */
  readonly worldCamera = new PIXI.Container({ label: 'worldCamera', zIndex: 0, sortableChildren: true, eventMode: 'none' });
  private cinematic = new CinematicSceneRenderer();
  private clouds: PIXI.Graphics[] = [];
  private currentEnvironment: EnvironmentDefinition = DEEP_NEBULA;
  private elapsed = 0;
  private initialized = false;
  private warpRemaining = 0;
  private scrollSpeed = 2.0;

  constructor(app: PIXI.Application | null, private readonly entities: EntitySystem, private readonly state: GameStateService) {
    this.app = app;
  }

  initialize(app?: PIXI.Application): void {
    if (this.initialized) return;
    if (app) this.app = app;
    if (!this.app) return;

    // worldCamera owns all world-space layers. Add to stage first so zIndex sorting works.
    this.app.stage.sortableChildren = true;
    this.app.stage.addChild(this.worldCamera);

    // Atmosphere lives inside the world camera so it follows camera transforms.
    this.worldCamera.addChild(this.atmosphere, this.cinematic.container);

    // debug + fade overlays stay on app.stage (viewport-space, outside camera transform).
    this.app.stage.addChild(this.debugGraphics, this.fadeGraphics);

    this.rebuildAtmosphere();
    this.initialized = true;
  }

  /**
   * Applies an environment preset to the render system.
   * Cleans up existing atmosphere graphics without leaking and reconstructs nebula clouds.
   */
  applyEnvironment(envOrId: EnvironmentDefinition | EnvironmentId): void {
    this.currentEnvironment = typeof envOrId === 'string' ? resolveEnvironment(envOrId) : envOrId;
    if (this.initialized) {
      this.rebuildAtmosphere();
    }
  }

  getEnvironment(): EnvironmentDefinition {
    return this.currentEnvironment;
  }

  setScrollSpeed(speed: number): void {
    if (Number.isFinite(speed) && speed >= 0) {
      this.scrollSpeed = speed;
    }
  }

  getScrollSpeed(): number {
    return this.scrollSpeed;
  }

  private rebuildAtmosphere(): void {
    this.clouds = [];
    this.atmosphere.removeChildren().forEach(child => child.destroy({ children: true }));

    // Void background fill
    this.atmosphere.addChild(
      new PIXI.Graphics().rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill(this.currentEnvironment.backgroundColor)
    );

    // Low-contrast radial gradient nebula clouds created once per environment
    const nebula = this.currentEnvironment.nebula;
    const c1 = nebula.primaryColor;
    const c2 = nebula.secondaryColor;
    const mid1 = nebula.intermediateColor1 ?? c1;
    const mid2 = nebula.intermediateColor2 ?? c2;

    for (let i = 0; i < 5; i++) {
      const isOdd = i % 2 !== 0;
      const gradient = new PIXI.FillGradient({
        type: 'radial',
        center: { x: 0.5, y: 0.5 },
        outerCenter: { x: 0.5, y: 0.5 },
        outerRadius: 0.5,
        colorStops: [
          { offset: 0, color: isOdd ? c1 : c2 },
          { offset: 0.5, color: isOdd ? mid1 : mid2 },
          { offset: 1, color: '#07091300' },
        ],
      });
      const cloud = new PIXI.Graphics().ellipse(0, 0, 250, 160).fill(gradient);
      cloud.once('destroyed', () => gradient.destroy());
      cloud.position.set(i * 190 - 10, 420 - i * 55);
      cloud.rotation = -0.4;
      cloud.alpha = nebula.intensity;
      this.clouds.push(cloud);
      this.atmosphere.addChild(cloud);
    }
  }

  beginWarp(): void { this.warpRemaining = MOTION.warp; }
  get warpProgress(): number { return this.warpRemaining > 0 ? 1 - this.warpRemaining / MOTION.warp : 0; }

  setFadeAlpha(alpha: number): void {
    this.fadeGraphics.clear();
    if (alpha > 0.001) {
      this.fadeGraphics.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x070913, alpha: Math.min(1, Math.max(0, alpha)) });
    }
  }

  /**
   * Apply a cinematic camera transform to the world layers.
   *
   * @param x      Horizontal offset in game pixels (positive = world shifts right / camera pans left).
   * @param y      Vertical offset in game pixels (positive = world shifts down / camera pans up).
   * @param zoom   Scale factor from canvas center. 1 = neutral. >1 = zoom in.
   */
  setCamera(x: number, y: number, zoom: number): void {
    this.worldCamera.pivot.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.worldCamera.position.set(GAME_WIDTH / 2 + x, GAME_HEIGHT / 2 + y);
    this.worldCamera.scale.set(zoom);
  }

  /**
   * Restore neutral camera state: no offset, no zoom.
   * Must be called on cutscene completion, skip, reset, and dispose.
   */
  resetCamera(): void {
    this.worldCamera.pivot.set(0, 0);
    this.worldCamera.position.set(0, 0);
    this.worldCamera.scale.set(1);
    this.atmosphere.x = 0;
    this.debugGraphics.x = 0;
    const stars = this.worldCamera.getChildByLabel('stars');
    if (stars) stars.x = 0;
  }

  /**
   * Apply a ground-traversal camera X offset to the worldCamera container.
   *
   * The world is stationary at x=0. Scrolling is achieved by translating
   * worldCamera.x to -cameraX so the viewport window moves through world space:
   *   worldCamera.x = -cameraX  →  left edge of viewport shows world coordinate cameraX.
   *
   * ## Separation of concerns
   * - CameraSystem computes cameraX (policy: dead zone, world clamping, scenario lock).
   * - GameRuntime calls this method each tick with the result.
   * - Flight levels never call this; their worldCamera.x stays at 0.
   */
  setGroundCameraX(cameraX: number): void {
    this.worldCamera.x = cameraX === 0 ? 0 : -cameraX;
    this.atmosphere.x = cameraX;
    const stars = this.worldCamera.getChildByLabel('stars');
    if (stars) stars.x = cameraX;
    const ground = this.entities.getGround?.();
    if (ground?.looping) ground.container.x = Math.floor(cameraX / ground.worldWidth) * ground.worldWidth;
    this.debugGraphics.x = -cameraX;
  }

  setCinematicScene(scene: CinematicScene | null, time = 0): void {
    this.cinematic.render(scene, time);
  }

  reset(): void {
    this.cinematic.clear();
    this.setFadeAlpha(0);
    this.resetCamera();
    this.warpRemaining = 0;
    this.elapsed = 0;
    for (const star of this.entities.getStars()) star.graphics.scale.set(1);
  }

  createBackground(): void { if (this.initialized) this.entities.createBackground(); }

  updateBackground(seconds: number): void {
    if (!this.initialized || seconds <= 0) return;
    this.elapsed += seconds;
    const warping = this.warpRemaining > 0;
    const envelope = warping ? Math.sin(Math.PI * this.warpProgress) : 0;
    this.warpRemaining = Math.max(0, this.warpRemaining - seconds);
    const driftSpeed = this.currentEnvironment.nebula.driftSpeed;

    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].x = i * 190 - 10 + Math.sin(this.elapsed * 0.06 * driftSpeed + i) * 16;
    }

    const starSpeedMult = this.currentEnvironment.stars.speedMultiplier;
    for (const star of this.entities.getStars()) {
      star.graphics.x -= star.speed * starSpeedMult * seconds * 60 * (1 + envelope * 100);
      star.graphics.scale.x = 1 + envelope * (12 + star.layer * 10);
      if (star.graphics.x + star.size * star.graphics.scale.x < 0) {
        star.graphics.x = GAME_WIDTH + star.size;
        star.graphics.y = Math.random() * GAME_HEIGHT;
      }
      star.update(seconds);
    }
  }

  update(seconds = 0, _entities?: unknown[]): void {
    if (!this.initialized) return;
    const astronaut = this.entities.getAstronaut();
    astronaut?.updatePresentation(seconds);
    if (astronaut && !this.state.getState().isStarted && !astronaut.dead) {
      astronaut.sprite.rotation = Math.sin(this.elapsed * 1.4) * 0.055;
    }
    this.updateDebugPresentation();
  }

  /**
   * Refresh or clear debug collision presentation immediately.
   * Works across active gameplay, paused states, level resets, and QA preview.
   */
  updateDebugPresentation(): void {
    if (!this.initialized) return;
    const g = this.debugGraphics;
    if (!this.state.getState().debugMode) {
      if (g.context.instructions.length) g.clear();
      return;
    }
    this.drawDebugGraphics();
  }

  private drawDebugGraphics(): void {
    const g = this.debugGraphics;
    g.clear();

    const astronaut = this.entities.getAstronaut();
    if (astronaut) {
      // 1. Hazard / collection hitbox (35x35)
      const bounds = astronaut.getScreenHitbox();
      g.rect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
        .stroke({ color: INK.cyan, width: 1 });

      // 2. Physical solid sliding body (50x50) in ground mode
      if (astronaut.getMovementMode() === 'ground') {
        const halfBW = ASTRONAUT.body.width / 2;
        const halfBH = ASTRONAUT.body.height / 2;
        g.rect(astronaut.worldX - halfBW, astronaut.sprite.y - halfBH, ASTRONAUT.body.width, ASTRONAUT.body.height)
          .stroke({ color: INK.ice, width: 1, alpha: 0.7 });
      }
    }

    // 3. Orbs (collection boundary)
    for (const orb of this.entities.getOrbs()) {
      if (!orb.collected) {
        g.circle(orb.x, orb.y, orb.radius).stroke({ color: INK.violet, width: 1 });
      }
    }

    // 4. Obstacles (planet 90% collision envelope and pipe rects)
    for (const obstacle of this.entities.getObstacles()) {
      if ('radius' in obstacle && typeof obstacle.radius === 'number') {
        g.circle(obstacle.x, obstacle.y, obstacle.radius * 0.9).stroke({ color: INK.hazard, width: 1 });
      } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
        const pipe = obstacle as { topPipe: PIXI.Graphics; bottomPipe: PIXI.Graphics; x: number };
        g.rect(pipe.x, 0, pipe.topPipe.width, pipe.topPipe.height).stroke({ color: INK.hazard, width: 1 });
        g.rect(pipe.x, pipe.bottomPipe.y, pipe.bottomPipe.width, pipe.bottomPipe.height).stroke({ color: INK.hazard, width: 1 });
      }
    }

    // 5. Natural Ground collision surface
    const ground = this.entities.getGround?.();
    if (ground) {
      const worldW = Math.max(GAME_WIDTH, ground.worldWidth);
      const startX = ground.looping ? -this.debugGraphics.x - 200 : 0;
      const endX = ground.looping ? -this.debugGraphics.x + GAME_WIDTH + 200 : worldW;
      g.moveTo(startX, ground.y).lineTo(endX, ground.y).stroke({ color: INK.cyan, width: 1.5, alpha: 0.8 });
    }

    // 6. Authored Solid Terrain Blocks
    for (const block of this.entities.getTerrainBlocks()) {
      const { x, y, width, height } = block.bounds;
      g.rect(x, y, width, height)
        .stroke({ color: block.diggable ? INK.amber : INK.muted, width: 1.5 });
      if (block.diggable) {
        g.moveTo(x, y).lineTo(x + width, y + height)
          .stroke({ color: INK.amber, width: 1, alpha: 0.5 });
      }
    }

    // 7. Temporary Player Wall Panels
    for (const wall of this.entities.getWalls()) {
      const { x, y, width, height } = wall.bounds;
      g.rect(x, y, width, height)
        .stroke({ color: INK.cyan, width: 1.5 });
    }

    // 8. Grapple Anchors
    for (const anchor of this.entities.getGrappleAnchors()) {
      g.circle(anchor.x, anchor.y, 10).stroke({ color: INK.cyan, width: 1.5 });
      g.moveTo(anchor.x - 14, anchor.y).lineTo(anchor.x + 14, anchor.y)
        .stroke({ color: INK.cyan, width: 1 });
      g.moveTo(anchor.x, anchor.y - 14).lineTo(anchor.x, anchor.y + 14)
        .stroke({ color: INK.cyan, width: 1 });
    }

    // 9. Scenario Trigger and Camera Bounds
    for (const scenario of this.entities.getScenarios()) {
      const trigger = scenario.trigger;
      g.rect(trigger.x, trigger.y, trigger.width, trigger.height)
        .stroke({ color: INK.violet, width: 1.5, alpha: 0.8 });

      if (scenario.cameraBounds) {
        const cb = scenario.cameraBounds;
        g.rect(cb.x, cb.y, cb.width, cb.height)
          .stroke({ color: INK.cyan, width: 1.5, alpha: 0.5 });
      }
    }
  }

  dispose(): void {
    if (!this.initialized) return;
    this.resetCamera();
    this.cinematic.dispose();
    this.atmosphere.destroy({ children: true });
    this.debugGraphics.destroy();
    this.fadeGraphics.destroy();
    this.worldCamera.destroy({ children: false }); // children are owned by EntitySystem
    this.clouds = [];
    this.initialized = false;
  }
}
