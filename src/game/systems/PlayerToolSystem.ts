import { Planet } from '../entities/Planet';
import { Orb } from '../entities/Orb';
import { ASTRONAUT, GAME_WIDTH } from '../config';
import { EntitySystem } from './entitySystem';
import { PlayerToolId, PlayerToolsDefinition, ToolUseResult } from '../tools/toolTypes';

/** Session-scoped gameplay owner. No rendering, campaign decisions, timers or event subscriptions. */
export class PlayerToolSystem {
  private config?: PlayerToolsDefinition;
  private equipped: PlayerToolId | null = null;
  private facing: -1 | 1 = 1;
  private result: ToolUseResult | null = null;

  constructor(private readonly entities: EntitySystem) {}

  configure(config?: PlayerToolsDefinition): void {
    this.entities.clearWalls();
    this.config = config;
    this.equipped = config?.equipped ?? null;
    this.facing = 1;
    this.result = null;
  }

  select(tool: PlayerToolId | null): boolean {
    if (tool !== null && (!this.config || tool !== 'wall-builder')) return false;
    this.equipped = tool;
    this.result = null;
    return true;
  }

  face(direction: -1 | 1): void { this.facing = direction; }
  getEquipped(): PlayerToolId | null { return this.equipped; }
  getConfig(): PlayerToolsDefinition | undefined { return this.config; }
  getLastResult(): ToolUseResult | null { return this.result; }

  use(): ToolUseResult {
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
    if (this.entities.getWalls().some(w => overlaps(w.bounds)) ||
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
