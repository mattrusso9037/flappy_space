import { GAME_WIDTH } from '../config';
import { ScenarioDefinition } from '../campaign/campaignTypes';
import { getLogger } from '../../utils/logger';

const logger = getLogger('CameraSystem');

/**
 * Pure camera follow service for world-space ground traversal levels.
 *
 * ## Concerns
 * - Camera follow: astronaut drives camera only after leaving the dead zone.
 * - World clamping: cameraX is bounded to [0, worldWidth - viewportWidth].
 * - Scenario lock: camera snaps to scenario.cameraBounds.x and holds.
 *
 * ## Not a concern
 * - Pixi transforms (those are applied by RenderSystem.setGroundCameraX).
 * - Astronaut screen position (that is computed in GameRuntime from worldX - cameraX).
 */
export class CameraSystem {
  private cameraX: number = 0;
  private lockedScenario: ScenarioDefinition | null = null;

  /** Left edge of the viewport dead zone (viewport-relative pixels). */
  private readonly deadZoneLeft: number;
  /** Right edge of the viewport dead zone (viewport-relative pixels). */
  private readonly deadZoneRight: number;

  /**
   * @param viewportWidth     Width of the canvas in game pixels (default: GAME_WIDTH).
   * @param deadZoneFraction  Fraction of viewport that is the dead zone (default: 0.34).
   *                          The dead zone is centered in the viewport.
   *                          Camera only pans when astronaut leaves this zone.
   */
  constructor(
    private readonly viewportWidth: number = GAME_WIDTH,
    deadZoneFraction: number = 0.34
  ) {
    const halfDead = (viewportWidth * deadZoneFraction) / 2;
    this.deadZoneLeft = viewportWidth / 2 - halfDead;
    this.deadZoneRight = viewportWidth / 2 + halfDead;
    logger.debug('CameraSystem initialized', { viewportWidth, deadZoneLeft: this.deadZoneLeft, deadZoneRight: this.deadZoneRight });
  }

  /**
   * Advance the camera one tick.
   *
   * @param worldX      Astronaut world X position.
   * @param worldWidth  Total world width in game pixels.
   * @returns           The new cameraX (left edge of viewport in world space).
   */
  update(worldX: number, worldWidth: number, looping = false, seconds = Infinity): number {
    if (this.lockedScenario) {
      // Clamp scenario lock to world bounds
      const target = this.lockedScenario.cameraBounds.x;
      const boundedTarget = looping ? target : Math.max(0, Math.min(worldWidth - this.viewportWidth, target));
      const maxStep = 480 * seconds;
      this.cameraX += Math.max(-maxStep, Math.min(maxStep, boundedTarget - this.cameraX));
      return this.cameraX;
    }

    // Dead zone follow: pan only when astronaut leaves the dead zone
    const previousX = this.cameraX;
    const screenX = worldX - this.cameraX;
    if (screenX < this.deadZoneLeft) {
      this.cameraX = worldX - this.deadZoneLeft;
    } else if (screenX > this.deadZoneRight) {
      this.cameraX = worldX - this.deadZoneRight;
    }

    this.cameraX = previousX + Math.max(-480 * seconds, Math.min(480 * seconds, this.cameraX - previousX));

    // Clamp camera to world bounds
    if (!looping) this.cameraX = Math.max(0, Math.min(worldWidth - this.viewportWidth, this.cameraX));
    return this.cameraX;
  }

  /** Lock the camera to a scenario's cameraBounds. */
  lockToScenario(scenario: ScenarioDefinition): void {
    this.lockedScenario = scenario;
    logger.info('Camera locked to scenario', { id: scenario.id });
  }

  /** Unlock the camera and resume astronaut-follow mode. */
  unlockFromScenario(): void {
    if (this.lockedScenario) {
      logger.info('Camera unlocked from scenario', { id: this.lockedScenario.id });
    }
    this.lockedScenario = null;
  }

  getCameraX(): number {
    return this.cameraX;
  }

  getDeadZoneLeft(): number {
    return this.deadZoneLeft;
  }

  getDeadZoneRight(): number {
    return this.deadZoneRight;
  }

  isLocked(): boolean {
    return this.lockedScenario !== null;
  }

  getLockedScenario(): ScenarioDefinition | null {
    return this.lockedScenario;
  }

  /** Reset all camera state. Call on level reset or transition. */
  reset(): void {
    this.cameraX = 0;
    this.lockedScenario = null;
    logger.debug('CameraSystem reset');
  }
}
