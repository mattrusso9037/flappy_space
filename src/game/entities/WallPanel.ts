import { Graphics } from 'pixi.js';
import { Rect } from '../campaign/campaignTypes';
import { INK } from '../visuals/tokens';

/** Temporary solid geometry. Lifetime and placement policy belong to PlayerToolSystem. */
export class WallPanel {
  readonly graphics: Graphics;
  constructor(readonly bounds: Readonly<Rect>, public remainingSeconds: number) {
    this.graphics = new Graphics({ label: 'wall-panel', eventMode: 'none' })
      .rect(0, 0, bounds.width, bounds.height).fill(INK.hull)
      .stroke({ color: INK.cyan, width: 2 })
      .moveTo(4, bounds.height - 4).lineTo(bounds.width - 4, 4)
      .stroke({ color: INK.muted, width: 1 })
      .rect(0, 0, bounds.width, 4).fill(INK.ice);
    this.graphics.position.set(bounds.x, bounds.y);
  }
  destroy(): void { this.graphics.destroy(); }
}
