import { describe, expect, it } from 'vitest';
import {
  isTerrainBlockStyleId,
  resolveTerrainBlockStyle,
  ALIEN_PLATFORM_STYLE,
  TERRAIN_BLOCK_STYLES,
} from './terrainBlockStyles';

describe('terrainBlockStyles registry', () => {
  it('resolves registered alien-platform style', () => {
    const style = resolveTerrainBlockStyle('alien-platform');
    expect(style).toBe(ALIEN_PLATFORM_STYLE);
    expect(style?.leftCapAsset).toBe('terrain-alien-platform-left');
    expect(style?.middleAsset).toBe('terrain-alien-platform-middle');
    expect(style?.rightCapAsset).toBe('terrain-alien-platform-right');
  });

  it('returns null for undefined, null or unknown style IDs', () => {
    expect(resolveTerrainBlockStyle(undefined)).toBeNull();
    expect(resolveTerrainBlockStyle('unknown-style')).toBeNull();
    expect(resolveTerrainBlockStyle('')).toBeNull();
  });

  it('correctly validates style IDs with type guard', () => {
    expect(isTerrainBlockStyleId('alien-platform')).toBe(true);
    expect(isTerrainBlockStyleId('not-a-style')).toBe(false);
    expect(isTerrainBlockStyleId(123)).toBe(false);
    expect(isTerrainBlockStyleId(null)).toBe(false);
  });

  it('contains valid asset references and dimensions for all styles', () => {
    for (const [id, style] of Object.entries(TERRAIN_BLOCK_STYLES)) {
      expect(style.id).toBe(id);
      expect(typeof style.name).toBe('string');
      expect(style.leftCapAsset).toBeTruthy();
      expect(style.middleAsset).toBeTruthy();
      expect(style.rightCapAsset).toBeTruthy();
      expect(style.capWidth).toBeGreaterThan(0);
      expect(style.assetHeight).toBeGreaterThan(0);
      expect(style.surfaceOffsetY).toBeGreaterThanOrEqual(0);
    }
  });
});
