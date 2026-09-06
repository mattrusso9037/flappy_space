import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Texture, Sprite, TilingSprite } from 'pixi.js';
import { TerrainBlock } from './TerrainBlock';
import assetManager from '../assetManager';

describe('TerrainBlock', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  it('positions container in world-space matching bounds.x and bounds.y', () => {
    const block = new TerrainBlock({
      id: 'world-ledge',
      bounds: { x: 1400, y: 220, width: 140, height: 30 },
      diggable: false,
    });
    expect(block.graphics.position.x).toBe(1400);
    expect(block.graphics.position.y).toBe(220);
    block.destroy();
  });

  it('falls back safely to placeholder Graphics when styleId is omitted or unknown', () => {
    const blockNoStyle = new TerrainBlock({
      id: 'unstyled',
      bounds: { x: 100, y: 200, width: 150, height: 40 },
      diggable: false,
    });
    expect(blockNoStyle.isTextured).toBe(false);
    expect(blockNoStyle.graphics.children.length).toBeGreaterThan(0);
    blockNoStyle.destroy();

    const blockUnknownStyle = new TerrainBlock({
      id: 'unknown',
      bounds: { x: 100, y: 200, width: 150, height: 40 },
      diggable: false,
      // @ts-expect-error - testing runtime fallback for invalid/unknown styleId
      styleId: 'non-existent-style',
    });
    expect(blockUnknownStyle.isTextured).toBe(false);
    blockUnknownStyle.destroy();
  });

  it('falls back safely to placeholder Graphics when assets are unavailable or return Texture.WHITE', () => {
    vi.spyOn(assetManager, 'getTexture').mockReturnValue(Texture.WHITE);
    const block = new TerrainBlock({
      id: 'fallback-block',
      bounds: { x: 200, y: 300, width: 180, height: 35 },
      diggable: false,
      styleId: 'alien-platform',
    });
    expect(block.isTextured).toBe(false);
    expect(block.graphics.children.length).toBe(1);
    block.destroy();
  });

  it('composes Left + Tiled Middle + Right modular presentation for arbitrary widths', () => {
    // Create valid mock textures with dimensions
    const makeMockTexture = (w: number, h: number) => {
      const tex = new Texture();
      Object.defineProperty(tex, 'width', { value: w, configurable: true });
      Object.defineProperty(tex, 'height', { value: h, configurable: true });
      return tex;
    };

    const leftTex = makeMockTexture(407, 238);
    const midTex = makeMockTexture(665, 238);
    const rightTex = makeMockTexture(403, 238);

    vi.spyOn(assetManager, 'getTexture').mockImplementation((name: string) => {
      if (name.includes('left')) return leftTex;
      if (name.includes('middle')) return midTex;
      if (name.includes('right')) return rightTex;
      return Texture.WHITE;
    });

    // 1. Wide ledge (width = 300 > 2 * capWidth)
    const wideBlock = new TerrainBlock({
      id: 'wide-ledge',
      bounds: { x: 500, y: 250, width: 300, height: 40 },
      diggable: false,
      styleId: 'alien-platform',
    });

    expect(wideBlock.isTextured).toBe(true);
    // Has left cap, tiling middle, right cap
    const children = wideBlock.graphics.children;
    expect(children.length).toBe(3);

    const leftSprite = children[0] as Sprite;
    const midSprite = children[1] as TilingSprite;
    const rightSprite = children[2] as Sprite;

    expect(leftSprite).toBeInstanceOf(Sprite);
    expect(midSprite).toBeInstanceOf(TilingSprite);
    expect(rightSprite).toBeInstanceOf(Sprite);

    // Left cap starts at 0
    expect(leftSprite.position.x).toBe(0);
    // Middle starts at left cap width
    expect(midSprite.position.x).toBe(leftSprite.width);
    // Right cap ends at wideBlock.bounds.width
    expect(rightSprite.position.x + rightSprite.width).toBeCloseTo(300, 1);
    // Middle width fills the span between caps
    expect(leftSprite.width + midSprite.width + rightSprite.width).toBeCloseTo(300, 1);

    // Collision bounds strictly unchanged
    expect(wideBlock.bounds).toEqual({ x: 500, y: 250, width: 300, height: 40 });

    wideBlock.destroy();
    expect(wideBlock.graphics.destroyed).toBe(true);

    // 2. Narrow ledge (width = 30 < 2 * naturalCapWidth)
    const narrowBlock = new TerrainBlock({
      id: 'narrow-ledge',
      bounds: { x: 100, y: 200, width: 30, height: 30 },
      diggable: false,
      styleId: 'alien-platform',
    });

    expect(narrowBlock.isTextured).toBe(true);
    // For narrow width <= 2 * capWidth, left and right caps meet without middle
    const narrowChildren = narrowBlock.graphics.children;
    expect(narrowChildren.length).toBe(2);
    const nLeft = narrowChildren[0] as Sprite;
    const nRight = narrowChildren[1] as Sprite;
    expect(nLeft.width).toBe(15);
    expect(nRight.width).toBe(15);
    expect(nRight.position.x).toBe(15);
    expect(narrowBlock.bounds).toEqual({ x: 100, y: 200, width: 30, height: 30 });

    narrowBlock.destroy();
  });

  it('renders diggable fissure indicator when diggable is true on textured platform', () => {
    const makeMockTexture = (w: number, h: number) => {
      const tex = new Texture();
      Object.defineProperty(tex, 'width', { value: w, configurable: true });
      Object.defineProperty(tex, 'height', { value: h, configurable: true });
      return tex;
    };
    vi.spyOn(assetManager, 'getTexture').mockReturnValue(makeMockTexture(100, 100));

    const block = new TerrainBlock({
      id: 'diggable-ledge',
      bounds: { x: 200, y: 300, width: 160, height: 30 },
      diggable: true,
      styleId: 'alien-platform',
    });

    expect(block.isTextured).toBe(true);
    // 3 sprites (left, middle, right) + 1 diggable fissure graphics
    expect(block.graphics.children.length).toBe(4);
    expect(block.diggable).toBe(true);
    block.destroy();
  });
});
