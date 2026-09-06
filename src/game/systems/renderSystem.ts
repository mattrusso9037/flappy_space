import * as PIXI from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { GameStateService } from '../gameStateService';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { DEPTH, INK, MOTION } from '../visuals/tokens';
import { EnvironmentDefinition, EnvironmentId } from '../environments/environmentTypes';
import { DEEP_NEBULA, resolveEnvironment } from '../environments/environments';

/** Owns atmosphere, parallax, warp and presentation transforms. No extra ticker. */
export class RenderSystem {
  private app: PIXI.Application | null;
  private atmosphere = new PIXI.Container({ label: 'atmosphere', zIndex: DEPTH.atmosphere, eventMode: 'none' });
  private debugGraphics = new PIXI.Graphics({ zIndex: DEPTH.debug });
  private clouds: PIXI.Graphics[] = [];
  private currentEnvironment: EnvironmentDefinition = DEEP_NEBULA;
  private elapsed = 0;
  private initialized = false;
  private warpRemaining = 0;

  constructor(app: PIXI.Application | null, private readonly entities: EntitySystem, private readonly state: GameStateService) {
    this.app = app;
  }

  initialize(app?: PIXI.Application): void {
    if (this.initialized) return;
    if (app) this.app = app;
    if (!this.app) return;
    this.app.stage.addChild(this.atmosphere, this.debugGraphics);
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

  reset(): void {
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
    const g = this.debugGraphics;
    if (!this.state.getState().debugMode) { if (g.context.instructions.length) g.clear(); return; }
    g.clear();
    if (astronaut) {
      const bounds = astronaut.getHitbox();
      g.rect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
        .stroke({ color: INK.cyan, width: 1 });
    }
    for (const orb of this.entities.getOrbs()) g.circle(orb.x, orb.y, orb.radius).stroke({ color: INK.violet, width: 1 });
    for (const obstacle of this.entities.getObstacles()) {
      if ('radius' in obstacle && typeof obstacle.radius === 'number') {
        g.circle(obstacle.x, obstacle.y, obstacle.radius * 0.9).stroke({ color: INK.hazard, width: 1 });
      }
    }
  }

  dispose(): void {
    if (!this.initialized) return;
    this.atmosphere.destroy({ children: true });
    this.debugGraphics.destroy();
    this.clouds = [];
    this.initialized = false;
  }
}
