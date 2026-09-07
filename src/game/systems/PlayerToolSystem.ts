import { Planet } from '../entities/Planet';
import { Orb } from '../entities/Orb';
import { ASTRONAUT, GAME_WIDTH } from '../config';
import { EntitySystem } from './entitySystem';
import { GrappleAnchor, PlayerToolId, PlayerToolsDefinition, ToolUseResult } from '../tools/toolTypes';
import { lineSegmentIntersectsRect, lineSegmentIntersectsCircle, Point } from './solidCollision';

/** Session-scoped gameplay owner. No rendering, campaign decisions, timers or event subscriptions. */
export class PlayerToolSystem {
  private attachment: GrappleAnchor | null = null;
  private config?: PlayerToolsDefinition;
  private equipped: PlayerToolId | null = null;
  private facing: -1 | 1 = 1;
  private result: ToolUseResult | null = null;

  constructor(private readonly entities: EntitySystem) {}

  configure(config?: PlayerToolsDefinition): void {
    this.cancel();
    this.entities.configureGrappleAnchors(config?.grappleHook?.anchors ?? []);
    this.entities.clearWalls();
    this.config = config;
    this.equipped = config?.equipped ?? null;
    this.facing = 1;
    this.result = null;
  }

  select(tool: PlayerToolId | null): boolean {
    if (tool !== null && (tool === 'wall-builder' ? !this.config?.wallBuilder :
        tool === 'grapple-hook' ? !this.config?.grappleHook : !this.config?.shovel)) return false;
    this.cancel();
    this.equipped = tool;
    this.result = null;
    return true;
  }

  face(direction: -1 | 1): void { this.facing = direction; }
  getEquipped(): PlayerToolId | null { return this.equipped; }
  getConfig(): PlayerToolsDefinition | undefined { return this.config; }
  getLastResult(): ToolUseResult | null { return this.result; }

  getAttachment(): Readonly<GrappleAnchor> | null { return this.attachment; }

  cancel(): void {
    if (this.attachment) this.result = 'released';
    this.attachment = null;
    this.entities.showGrapple(null);
  }

  hasLineOfSight(from: Point, to: Point): boolean {
    for (const rect of this.entities.getSolidBounds()) {
      if (lineSegmentIntersectsRect(from, to, rect)) return false;
    }
    for (const obstacle of this.entities.getObstacles()) {
      if (obstacle instanceof Orb) continue;
      if (obstacle instanceof Planet || ('radius' in obstacle && typeof (obstacle as Planet).radius === 'number')) {
        const planet = obstacle as Planet;
        if (lineSegmentIntersectsCircle(from, to, { x: planet.x, y: planet.y, radius: planet.radius * 0.9 })) {
          return false;
        }
      } else if ('topPipe' in obstacle && 'bottomPipe' in obstacle) {
        const pipe = obstacle as { topPipe: { width: number; height: number }; bottomPipe: { width: number; height: number; y: number }; x: number };
        const topRect = { x: pipe.x, y: 0, width: pipe.topPipe.width, height: pipe.topPipe.height };
        const bottomRect = { x: pipe.x, y: pipe.bottomPipe.y, width: pipe.bottomPipe.width, height: pipe.bottomPipe.height };
        if (lineSegmentIntersectsRect(from, to, topRect) || lineSegmentIntersectsRect(from, to, bottomRect)) {
          return false;
        }
      }
    }
    const groundY = this.entities.getGroundY();
    if (groundY !== null && (from.y >= groundY || to.y >= groundY)) {
      return false;
    }
    return true;
  }

  private fire(): ToolUseResult {
    if (this.attachment) { this.cancel(); return this.result = 'released'; }
    const pilot = this.entities.getAstronaut();
    const config = this.config?.grappleHook;
    if (!pilot || pilot.dead || !config || !Number.isFinite(pilot.worldX) ||
        !Number.isFinite(pilot.sprite.y)) return this.result = 'invalid-target';
    const pilotPos = { x: pilot.worldX, y: pilot.sprite.y };
    // Deterministic nearest anchor above and ahead with clear line of sight. Authored order breaks ties.
    const anchor = config.anchors.filter(a => (a.x - pilotPos.x) * this.facing >= 0 &&
      a.y < pilotPos.y && Math.hypot(a.x - pilotPos.x, a.y - pilotPos.y) <= config.range &&
      this.hasLineOfSight(pilotPos, a))
      .sort((a, b) => Math.hypot(a.x - pilotPos.x, a.y - pilotPos.y) -
        Math.hypot(b.x - pilotPos.x, b.y - pilotPos.y))[0];
    if (!anchor) return this.result = 'invalid-target';
    this.attachment = anchor;
    this.entities.showGrapple(anchor);
    return this.result = 'attached';
  }

  /** Physics calls this before normal integration and swept solid collision. */
  applyGrapple(seconds: number): void {
    const pilot = this.entities.getAstronaut();
    const anchor = this.attachment;
    if (!anchor) return;
    if (!pilot || pilot.dead) { this.cancel(); return; }
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const dx = anchor.x - pilot.worldX, dy = anchor.y - pilot.sprite.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance <= 30) { this.cancel(); return; }
    const speed = Math.min(this.config!.grappleHook!.pullSpeed, (distance - 25) / seconds);
    // Astronaut velocities use pixels per nominal 60 Hz step.
    pilot.horizontalVelocity = dx / distance * speed * 0.016667;
    pilot.velocity = dy / distance * speed * 0.016667;
    pilot.isGrounded = false;
  }

  private dig(): ToolUseResult {
    const pilot = this.entities.getAstronaut();
    const config = this.config?.shovel;
    if (!pilot || pilot.dead || !config || pilot.getMovementMode() !== 'ground' ||
        !Number.isFinite(pilot.worldX) || !Number.isFinite(pilot.sprite.y)) {
      return this.result = 'invalid-target';
    }
    const edge = pilot.worldX + this.facing * ASTRONAUT.body.width / 2;
    // Horizontal strike from the body edge. The nearest solid blocks targets behind it.
    const candidates = this.entities.getSolidBounds().map(bounds => ({
      bounds,
      distance: this.facing === 1 ? bounds.x - edge : edge - bounds.x - bounds.width,
    })).filter(({ bounds, distance }) => distance >= -0.01 && distance <= config.reach &&
      pilot.sprite.y > bounds.y && pilot.sprite.y < bounds.y + bounds.height)
      .sort((a, b) => a.distance - b.distance);
    const target = candidates[0]?.bounds;
    const block = this.entities.getTerrainBlocks().find(candidate => candidate.bounds === target);
    if (!block || !this.entities.digTerrainBlock(block)) return this.result = 'invalid-target';
    return this.result = 'dug';
  }

  use(): ToolUseResult {
    if (this.equipped === 'shovel') return this.dig();
    if (this.equipped === 'grapple-hook') return this.fire();
    const config = this.config?.wallBuilder;
    const pilot = this.entities.getAstronaut();
    const groundY = this.entities.getGroundY();
    if (!config || this.equipped !== 'wall-builder') return this.result = 'no-tool';
    // Ground means the natural terrain, never another panel or an airborne position.
    if (!pilot || pilot.dead || pilot.getMovementMode() !== 'ground' || groundY === null ||
        !pilot.isGrounded || Math.abs(pilot.sprite.y + ASTRONAUT.body.height / 2 - groundY) > 0.01 ||
        !Number.isFinite(pilot.worldX) || !Number.isFinite(pilot.sprite.y)) return this.result = 'invalid-ground';

    const x = pilot.worldX + (this.facing > 0 ? ASTRONAUT.body.width / 2 + 8 : -ASTRONAUT.body.width / 2 - 8 - config.width);
    const rect = { x, y: groundY - config.height, width: config.width, height: config.height };
    const world = this.entities.getWorldDef();
    if (rect.y < 0 || (world?.traversal !== 'loop' && (x < 0 || x + rect.width > (world?.width ?? GAME_WIDTH)))) {
      return this.result = 'blocked';
    }
    const overlaps = (other: { x: number; y: number; width: number; height: number }) =>
      rect.x < other.x + other.width && rect.x + rect.width > other.x &&
      rect.y < other.y + other.height && rect.y + rect.height > other.y;
    if (this.entities.getSolidBounds().some(overlaps) ||
        [...this.entities.getObstacles(), ...this.entities.getOrbs()].some(o => {
          if (!(o instanceof Planet) && !(o instanceof Orb)) return true;
          return overlaps({ x: o.x - o.radius, y: o.y - o.radius, width: o.radius * 2, height: o.radius * 2 });
        })) return this.result = 'blocked';

    // Validate before replacing: a failed use never destroys the existing panel.
    if (this.entities.getWalls().length >= config.maxActive) {
      this.entities.removeWall(this.entities.getWalls()[0]);
    }
    this.entities.createWall(rect, config.lifetimeSeconds);
    return this.result = 'placed';
  }

  remove(): ToolUseResult {
    if (this.equipped === 'grapple-hook') {
      const attached = !!this.attachment;
      this.cancel();
      return this.result = attached ? 'released' : 'empty';
    }
    if (this.equipped !== 'wall-builder') return this.result = 'no-tool';
    const walls = this.entities.getWalls();
    const latest = walls[walls.length - 1];
    if (!latest) return this.result = 'empty';
    this.entities.removeWall(latest);
    return this.result = 'removed';
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    for (const wall of [...this.entities.getWalls()]) {
      wall.remainingSeconds -= seconds;
      if (wall.remainingSeconds <= 0) this.entities.removeWall(wall);
    }
  }

  dispose(): void { this.configure(); }
}
