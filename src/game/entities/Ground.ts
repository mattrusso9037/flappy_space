import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { INK } from '../visuals/tokens';
import { GroundGameplayDefinition } from '../campaign/campaignTypes';
import { getLogger } from '../../utils/logger';

const logger = getLogger('Ground');

export interface GroundOptions {
  height?: number;
  style?: 'alien-crust' | 'rocky' | 'default';
}

/**
 * Ground entity representing the solid planetary surface of an alien planet.
 * Renders an alien crust terrain with bioluminescent crest and scrolling surface features.
 */
export class Ground {
  public readonly container: PIXI.Container;
  public readonly y: number;
  public readonly height: number;
  public readonly style: string;

  private bedrockGraphics: PIXI.Graphics;
  private surfaceContainer: PIXI.Container;
  private detailSpans: { graphics: PIXI.Graphics; baseX: number; width: number }[] = [];
  private scrollOffset: number = 0;

  constructor(config?: GroundGameplayDefinition | GroundOptions) {
    this.height = config?.height ?? 80;
    this.y = GAME_HEIGHT - this.height;
    this.style = config?.style ?? 'alien-crust';

    this.container = new PIXI.Container({
      label: 'ground',
      eventMode: 'none',
    });

    this.bedrockGraphics = new PIXI.Graphics();
    this.surfaceContainer = new PIXI.Container({ label: 'groundSurface' });

    this.container.addChild(this.bedrockGraphics, this.surfaceContainer);
    this.buildTerrain();

    logger.info(`Ground created at y=${this.y}, height=${this.height}, style=${this.style}`);
  }

  private buildTerrain(): void {
    const g = this.bedrockGraphics;
    g.clear();

    // 1. Solid planetary bedrock down to GAME_HEIGHT
    g.rect(0, this.y, GAME_WIDTH, this.height).fill(0x0c081d);

    // 2. Upper strata stratum (weathered alien crust layer)
    g.rect(0, this.y, GAME_WIDTH, 14).fill(0x1a1236);

    // 3. Bioluminescent neon crest line (violet core + cyan edge)
    g.moveTo(0, this.y)
      .lineTo(GAME_WIDTH, this.y)
      .stroke({ color: INK.violet, width: 2.5 });

    g.moveTo(0, this.y)
      .lineTo(GAME_WIDTH, this.y)
      .stroke({ color: INK.cyan, width: 1, alpha: 0.65 });

    // 4. Soft atmospheric ground haze gradient just above the surface
    const hazeGradient = new PIXI.FillGradient({
      type: 'linear',
      start: { x: 0, y: this.y - 30 },
      end: { x: 0, y: this.y },
      colorStops: [
        { offset: 0, color: '#a855f700' },
        { offset: 1, color: '#a855f725' },
      ],
    });
    g.rect(0, this.y - 30, GAME_WIDTH, 30).fill(hazeGradient);
    g.once('destroyed', () => hazeGradient.destroy());

    // 5. Procedural scrolling surface details (crystals, rock spires, crater ridges)
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
        ]).fill({ color: INK.cyan, alpha: 0.85 });

        detailG.poly([
          5, 0,
          2, -10,
          5, -16,
          8, -10,
        ]).fill({ color: INK.violet, alpha: 0.75 });
      } else if (i % 3 === 1) {
        // Jagged alien rock spire
        detailG.poly([
          -10, 0,
          -3, -12,
          2, -16,
          8, -6,
          14, 0,
        ]).fill(0x231845);
        detailG.moveTo(-3, -12).lineTo(2, -16).stroke({ color: INK.violet, width: 1 });
      } else {
        // Low crust outcrop
        detailG.poly([
          -12, 0,
          -6, -6,
          6, -6,
          12, 0,
        ]).fill(0x1e153a);
        detailG.moveTo(-6, -6).lineTo(6, -6).stroke({ color: INK.cyan, width: 0.8, alpha: 0.5 });
      }

      detailG.position.set(x, this.y);
      this.surfaceContainer.addChild(detailG);
      this.detailSpans.push({ graphics: detailG, baseX: x, width: 24 });
    }
  }

  /**
   * Update scrolling ground surface details based on level scroll speed.
   */
  public update(deltaSeconds: number, scrollSpeed: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    // Movement matches obstacle scroll velocity: speed * 60 * deltaSeconds
    const movement = scrollSpeed * 60 * deltaSeconds;
    this.scrollOffset += movement;

    const wrapDistance = GAME_WIDTH * 1.6;

    for (const span of this.detailSpans) {
      let x = (span.baseX - this.scrollOffset) % wrapDistance;
      if (x < -span.width) {
        x += wrapDistance;
      }
      span.graphics.x = x;
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true });
    this.detailSpans = [];
    logger.info('Ground destroyed');
  }
}
