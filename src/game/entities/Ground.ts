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
}

/**
 * Ground entity representing the solid planetary surface of an alien planet.
 * Renders an alien crust terrain with bioluminescent crest and scrolling surface features.
 * Level-agnostic: knows only geometric height and visual terrain presentation tokens.
 */
export class Ground {
  public readonly container: PIXI.Container;
  public readonly y: number;
  public readonly height: number;
  public readonly terrain: TerrainPresentationDefinition;

  private bedrockGraphics: PIXI.Graphics;
  private surfaceContainer: PIXI.Container;
  private detailSpans: { graphics: PIXI.Graphics; baseX: number; width: number }[] = [];
  private scrollOffset: number = 0;

  constructor(
    configOrHeight?: number | GroundGameplayDefinition | GroundOptions,
    terrainOverride?: TerrainPresentationDefinition | TerrainId
  ) {
    if (typeof configOrHeight === 'number') {
      this.height = configOrHeight;
    } else if (configOrHeight && 'height' in configOrHeight && typeof configOrHeight.height === 'number') {
      this.height = configOrHeight.height;
    } else {
      this.height = 80;
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

    logger.info(`Ground created at y=${this.y}, height=${this.height}, terrain=${this.terrain.id}`);
  }

  public get terrainId(): TerrainId {
    return this.terrain.id;
  }

  /** Backwards-compatible alias for terrainId */
  public get style(): string {
    return this.terrain.id;
  }

  public getDetailSpans(): readonly { readonly graphics: PIXI.Graphics; readonly baseX: number; readonly width: number }[] {
    return this.detailSpans;
  }

  public getScrollOffset(): number {
    return this.scrollOffset;
  }

  private buildTerrain(): void {
    const g = this.bedrockGraphics;
    g.clear();

    // 1. Solid planetary bedrock down to GAME_HEIGHT (uses canonical token from terrain preset)
    g.rect(0, this.y, GAME_WIDTH, this.height).fill(this.terrain.bedrockColor);

    // 2. Upper strata stratum (weathered crust layer)
    g.rect(0, this.y, GAME_WIDTH, 14).fill(this.terrain.strataColor);

    // 3. Bioluminescent neon crest line (crest token core + accent token edge)
    g.moveTo(0, this.y)
      .lineTo(GAME_WIDTH, this.y)
      .stroke({ color: this.terrain.crestColor, width: 2.5 });

    g.moveTo(0, this.y)
      .lineTo(GAME_WIDTH, this.y)
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
    g.rect(0, this.y - 30, GAME_WIDTH, 30).fill(hazeGradient);
    g.once('destroyed', () => hazeGradient.destroy());

    // 5. Procedural scrolling surface details (crystals, rock spires, crust ridges)
    this.surfaceContainer.removeChildren().forEach(c => c.destroy());
    this.detailSpans = [];

    // Distribute surface features across two canvas widths to tile smoothly
    const featureCount = 12;
    const spacing = (GAME_WIDTH * 1.6) / featureCount;

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
      this.detailSpans.push({ graphics: detailG, baseX: x, width: 24 });
    }
  }

  /**
   * Update scrolling ground surface details based on level scroll speed.
   * Supports both forward (positive) and backward (negative) scroll speeds.
   * Presentation only; does not affect collision geometry or surface Y coordinate.
   */
  public updatePresentation(deltaSeconds: number, scrollSpeed: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || !Number.isFinite(scrollSpeed) || scrollSpeed === 0) return;

    // Movement matches obstacle scroll velocity: speed * 60 * deltaSeconds
    const movement = scrollSpeed * 60 * deltaSeconds;
    this.scrollOffset += movement;

    const wrapDistance = GAME_WIDTH * 1.6;

    for (const span of this.detailSpans) {
      const minX = -span.width;
      const rawOffset = span.baseX - this.scrollOffset - minX;
      const wrappedOffset = ((rawOffset % wrapDistance) + wrapDistance) % wrapDistance;
      span.graphics.x = wrappedOffset + minX;
    }
  }

  /** Backwards-compatible alias for updatePresentation */
  public update(deltaSeconds: number, scrollSpeed: number): void {
    this.updatePresentation(deltaSeconds, scrollSpeed);
  }

  public destroy(): void {
    this.container.destroy({ children: true });
    this.detailSpans = [];
    logger.info('Ground destroyed');
  }
}
