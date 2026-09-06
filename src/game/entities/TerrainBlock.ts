import { Graphics } from 'pixi.js';
import { TerrainBlockDefinition, Rect } from '../campaign/campaignTypes';
import { INK } from '../visuals/tokens';

/** Authored collision geometry is independent of presentation and copied per session. */
export class TerrainBlock {
  readonly id: string;
  readonly bounds: Readonly<Rect>;
  readonly diggable: boolean;
  readonly graphics: Graphics;

  constructor(definition: TerrainBlockDefinition) {
    this.id = definition.id;
    this.bounds = Object.freeze({ ...definition.bounds });
    this.diggable = definition.diggable;
    const { x, y, width, height } = this.bounds;
    this.graphics = new Graphics({ label: 'terrain-block', eventMode: 'none' })
      .rect(0, 0, width, height).fill(INK.hull)
      .stroke({ color: this.diggable ? INK.amber : INK.muted, width: 2 });
    if (this.diggable) {
      this.graphics.moveTo(width * 0.3, 0).lineTo(width * 0.6, height * 0.4)
        .lineTo(width * 0.35, height * 0.65).lineTo(width * 0.6, height)
        .stroke({ color: INK.amber, width: 2 });
    }
    this.graphics.position.set(x, y);
  }

  destroy(): void { this.graphics.destroy(); }
}
