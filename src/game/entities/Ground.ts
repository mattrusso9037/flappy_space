import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { GroundGameplayDefinition } from '../campaign/campaignTypes';
import {
  TerrainPresentationDefinition,
  TerrainId,
  resolveTerrainPresentation,
  isTerrainId,
} from '../visuals/terrainPresets';
import { getLogger } from '../../utils/logger';

const logger = getLogger('Ground');

export interface GroundOptions {
  height?: number;
  terrain?: TerrainPresentationDefinition | TerrainId;
  /** World width in pixels. Defaults to GAME_WIDTH for flight/non-world levels. */
  worldWidth?: number;
}

/**
 * Ground entity representing the solid planetary surface of an alien planet.
 *
 * In world-space mode (worldWidth > GAME_WIDTH), the ground container spans the
 * full world width and is placed at x=0 in world space. The RenderSystem's
 * worldCamera transform scrolls it into view as the camera pans.
 *
 * In viewport mode (worldWidth = GAME_WIDTH or omitted), the ground spans exactly
 * the viewport — identical to the original behavior, preserving flight levels.
 *
 * Level-agnostic: knows only geometric height, world width, and visual terrain tokens.
 * Does not scroll its own presentation; camera movement drives the visual traversal.
 */
export class Ground {
  public readonly container: PIXI.Container;
  public readonly y: number;
  public readonly height: number;
  public readonly worldWidth: number;
  public readonly terrain: TerrainPresentationDefinition;

  private bedrockGraphics: PIXI.Graphics;
  private surfaceContainer: PIXI.Container;

  constructor(
    configOrHeight?: number | GroundGameplayDefinition | GroundOptions,
    terrainOverride?: TerrainPresentationDefinition | TerrainId,
    worldWidthOverride?: number,
    public readonly looping = false
  ) {
    if (typeof configOrHeight === 'number') {
      this.height = configOrHeight;
      this.worldWidth = worldWidthOverride ?? GAME_WIDTH;
    } else if (configOrHeight && 'height' in configOrHeight && typeof configOrHeight.height === 'number') {
      this.height = configOrHeight.height;
      this.worldWidth =
        worldWidthOverride ??
        ('worldWidth' in configOrHeight && typeof configOrHeight.worldWidth === 'number'
          ? configOrHeight.worldWidth
          : GAME_WIDTH);
    } else {
      this.height = 80;
      this.worldWidth = worldWidthOverride ?? GAME_WIDTH;
    }

    this.y = GAME_HEIGHT - this.height;

    // Resolve presentation terrain
    let terrainCandidate: TerrainPresentationDefinition | TerrainId | undefined = terrainOverride;
    if (!terrainCandidate && typeof configOrHeight === 'object' && configOrHeight !== null) {
      if ('terrain' in configOrHeight && configOrHeight.terrain) {
        terrainCandidate = configOrHeight.terrain;
      }
    }

    if (typeof terrainCandidate === 'string' && isTerrainId(terrainCandidate)) {
      this.terrain = resolveTerrainPresentation(terrainCandidate);
    } else if (terrainCandidate && typeof terrainCandidate === 'object' && 'id' in terrainCandidate) {
      this.terrain = terrainCandidate;
    } else {
      this.terrain = resolveTerrainPresentation();
    }

    this.container = new PIXI.Container({
      label: 'ground',
      eventMode: 'none',
    });

    this.bedrockGraphics = new PIXI.Graphics();
    this.surfaceContainer = new PIXI.Container({ label: 'groundSurface' });

    this.container.addChild(this.bedrockGraphics, this.surfaceContainer);
    this.buildTerrain();
    if (this.looping) {
      for (const offset of [-this.worldWidth, this.worldWidth]) {
        const tile = new PIXI.Container({ x: offset });
        tile.addChild(new PIXI.Graphics(this.bedrockGraphics.context));
        for (const detail of this.surfaceContainer.children) {
          if (detail instanceof PIXI.Graphics) {
            const copy = new PIXI.Graphics(detail.context);
            copy.position.copyFrom(detail.position);
            tile.addChild(copy);
          }
        }
        this.container.addChild(tile);
      }
    }

    logger.info(`Ground created at y=${this.y}, height=${this.height}, worldWidth=${this.worldWidth}, terrain=${this.terrain.id}`);
  }

  public get terrainId(): TerrainId {
    return this.terrain.id;
  }

  /** Backwards-compatible alias for terrainId */
  public get style(): string {
    return this.terrain.id;
  }

  private buildTerrain(): void {
    const g = this.bedrockGraphics;
    g.clear();

    // 1. Solid planetary bedrock across the full world width
    g.rect(0, this.y, this.worldWidth, this.height).fill(this.terrain.bedrockColor);

    // 2. Upper strata stratum (weathered crust layer)
    g.rect(0, this.y, this.worldWidth, 14).fill(this.terrain.strataColor);

    // 3. Bioluminescent neon crest line (crest token core + accent token edge)
    g.moveTo(0, this.y)
      .lineTo(this.worldWidth, this.y)
      .stroke({ color: this.terrain.crestColor, width: 2.5 });

    g.moveTo(0, this.y)
      .lineTo(this.worldWidth, this.y)
      .stroke({ color: this.terrain.accentColor, width: 1, alpha: 0.65 });

    // 4. Soft atmospheric ground haze gradient just above the surface
    const hazeGradient = new PIXI.FillGradient({
      type: 'linear',
      start: { x: 0, y: this.y - 30 },
      end: { x: 0, y: this.y },
      colorStops: [
        { offset: 0, color: `${this.terrain.hazeColor}00` },
        { offset: 1, color: `${this.terrain.hazeColor}25` },
      ],
    });
    g.rect(0, this.y - 30, this.worldWidth, 30).fill(hazeGradient);
    g.once('destroyed', () => hazeGradient.destroy());

    // 5. Procedural surface details (crystals, rock spires, crust ridges) at fixed world positions.
    // Distributed across the full world width — camera movement makes them scroll naturally.
    this.surfaceContainer.removeChildren().forEach(c => c.destroy());

    const spacing = this.worldWidth / 12;
    const featureCount = Math.ceil(this.worldWidth / spacing);

    for (let i = 0; i < featureCount; i++) {
      const detailG = new PIXI.Graphics();
      const x = i * spacing;
      const isCrystal = i % 3 === 0;

      if (isCrystal) {
        // Glowing alien crystal cluster
        detailG.poly([
          0, 0,
          -4, -14,
          0, -22,
          4, -14,
        ]).fill({ color: this.terrain.accentColor, alpha: 0.85 });

        detailG.poly([
          5, 0,
          2, -10,
          5, -16,
          8, -10,
        ]).fill({ color: this.terrain.crestColor, alpha: 0.75 });
      } else if (i % 3 === 1) {
        // Jagged alien rock spire
        detailG.poly([
          -10, 0,
          -3, -12,
          2, -16,
          8, -6,
          14, 0,
        ]).fill(this.terrain.strataColor);
        detailG.moveTo(-3, -12).lineTo(2, -16).stroke({ color: this.terrain.crestColor, width: 1 });
      } else {
        // Low crust outcrop
        detailG.poly([
          -12, 0,
          -6, -6,
          6, -6,
          12, 0,
        ]).fill(this.terrain.bedrockColor);
        detailG.moveTo(-6, -6).lineTo(6, -6).stroke({ color: this.terrain.accentColor, width: 0.8, alpha: 0.5 });
      }

      detailG.position.set(x, this.y);
      this.surfaceContainer.addChild(detailG);
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true });
    logger.info('Ground destroyed');
  }
}
