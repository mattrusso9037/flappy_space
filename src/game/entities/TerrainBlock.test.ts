import { describe, expect, it } from 'vitest';
import { TerrainBlock } from './TerrainBlock';

describe('TerrainBlock', () => {
  it.each([true, false])('copies gameplay bounds independently of presentation (diggable %s)', diggable => {
    const definition = { id: 'block', bounds: { x: 300, y: 400, width: 60, height: 100 }, diggable };
    const block = new TerrainBlock(definition);
    definition.bounds.x = 0;
    block.graphics.scale.set(2);
    expect(block.bounds).toEqual({ x: 300, y: 400, width: 60, height: 100 });
    expect(block.diggable).toBe(diggable);
    block.destroy();
    expect(block.graphics.destroyed).toBe(true);
  });
});
