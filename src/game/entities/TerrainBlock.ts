import { Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import { TerrainBlockDefinition, Rect } from '../campaign/campaignTypes';
import { INK } from '../visuals/tokens';
import { resolveTerrainBlockStyle, TerrainBlockStyleDefinition, TerrainBlockStyleId } from '../visuals/terrainBlockStyles';
import assetManager from '../assetManager';

/** Authored collision geometry is independent of presentation and copied per session. */
export class TerrainBlock {
  readonly id: string;
  readonly bounds: Readonly<Rect>;
  readonly diggable: boolean;
  readonly styleId?: TerrainBlockStyleId;
  readonly graphics: Container;
  readonly isTextured: boolean;

  constructor(definition: TerrainBlockDefinition) {
    this.id = definition.id;
    this.bounds = Object.freeze({ ...definition.bounds });
    this.diggable = definition.diggable;
    this.styleId = definition.styleId;

    const { x, y, width, height } = this.bounds;
    this.graphics = new Container({ label: 'terrain-block', eventMode: 'none' });
    this.graphics.position.set(x, y);

    const style = resolveTerrainBlockStyle(definition.styleId);
    let textured = false;

    if (style) {
      try {
        const leftTex = assetManager.getTexture(style.leftCapAsset);
        const midTex = assetManager.getTexture(style.middleAsset);
        const rightTex = assetManager.getTexture(style.rightCapAsset);

        const isTexValid = (t: Texture | null | undefined): boolean =>
          Boolean(t && t !== Texture.WHITE && t !== Texture.EMPTY && t.width > 0 && t.height > 0);

        if (isTexValid(leftTex) && isTexValid(midTex) && isTexValid(rightTex)) {
          this.buildModularPlatform(leftTex, midTex, rightTex, style, width, height);
          textured = true;
        }
      } catch {
        textured = false;
      }
    }

    if (!textured) {
      this.buildPlaceholderGraphics(width, height);
    }
    this.isTextured = textured;
  }

  private buildModularPlatform(
    leftTex: Texture,
    midTex: Texture,
    rightTex: Texture,
    style: TerrainBlockStyleDefinition,
    width: number,
    height: number
  ): void {
    // Rock body in source texture is (assetHeight - surfaceOffsetY) = 158px.
    const sourceBodyHeight = style.assetHeight - style.surfaceOffsetY;
    const scale = Math.max(0.15, Math.min(0.5, height / sourceBodyHeight));
    const visualHeight = style.assetHeight * scale;
    const visualOffsetY = -style.surfaceOffsetY * scale;

    // Cap width: if the platform is narrower than two natural caps, each cap takes width / 2
    const naturalCapWidth = style.capWidth * scale;
    const capWidth = width <= naturalCapWidth * 2 ? width / 2 : naturalCapWidth;
    const middleWidth = Math.max(0, width - 2 * capWidth);

    // 1. Left Cap
    const leftSprite = new Sprite({ texture: leftTex });
    leftSprite.width = capWidth;
    leftSprite.height = visualHeight;
    leftSprite.position.set(0, visualOffsetY);
    this.graphics.addChild(leftSprite);

    // 2. Middle (Tileable)
    if (middleWidth > 0) {
      const middleSprite = new TilingSprite({
        texture: midTex,
        width: middleWidth,
        height: visualHeight,
      });
      middleSprite.tileScale.set(scale, scale);
      middleSprite.position.set(capWidth, visualOffsetY);
      this.graphics.addChild(middleSprite);
    }

    // 3. Right Cap
    const rightSprite = new Sprite({ texture: rightTex });
    rightSprite.width = capWidth;
    rightSprite.height = visualHeight;
    rightSprite.position.set(width - capWidth, visualOffsetY);
    this.graphics.addChild(rightSprite);

    // 4. Diggable visual indicator if block is diggable
    if (this.diggable) {
      const crack = new Graphics({ label: 'diggable-fissure', eventMode: 'none' })
        .moveTo(width * 0.3, 0).lineTo(width * 0.6, height * 0.4)
        .lineTo(width * 0.35, height * 0.65).lineTo(width * 0.6, height)
        .stroke({ color: INK.amber, width: 2, alpha: 0.85 });
      this.graphics.addChild(crack);
    }
  }

  private buildPlaceholderGraphics(width: number, height: number): void {
    const placeholder = new Graphics({ label: 'terrain-placeholder', eventMode: 'none' })
      .rect(0, 0, width, height).fill(INK.hull)
      .stroke({ color: this.diggable ? INK.amber : INK.muted, width: 2 });
    if (this.diggable) {
      placeholder.moveTo(width * 0.3, 0).lineTo(width * 0.6, height * 0.4)
        .lineTo(width * 0.35, height * 0.65).lineTo(width * 0.6, height)
        .stroke({ color: INK.amber, width: 2 });
    }
    this.graphics.addChild(placeholder);
  }

  destroy(): void {
    this.graphics.destroy({ children: true });
  }
}
