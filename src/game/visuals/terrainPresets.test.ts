import { describe, it, expect } from 'vitest';
import {
  isTerrainId,
  resolveTerrainPresentation,
  ALIEN_CRUST_TERRAIN,
  TERRAIN_PRESETS,
} from './terrainPresets';
import { INK } from './tokens';

describe('Terrain Presets Registry', () => {
  it('registers truthful alien-crust terrain preset with canonical design tokens', () => {
    expect(TERRAIN_PRESETS['alien-crust']).toBeDefined();
    expect(ALIEN_CRUST_TERRAIN.id).toBe('alien-crust');
    expect(ALIEN_CRUST_TERRAIN.bedrockColor).toBe(INK.void);
    expect(ALIEN_CRUST_TERRAIN.strataColor).toBe(INK.hull);
    expect(ALIEN_CRUST_TERRAIN.crestColor).toBe(INK.violet);
    expect(ALIEN_CRUST_TERRAIN.accentColor).toBe(INK.cyan);
  });

  it('validates known terrain IDs accurately with isTerrainId', () => {
    expect(isTerrainId('alien-crust')).toBe(true);
    expect(isTerrainId('rocky')).toBe(false);
    expect(isTerrainId('default')).toBe(false);
    expect(isTerrainId('')).toBe(false);
    expect(isTerrainId(null)).toBe(false);
    expect(isTerrainId(undefined)).toBe(false);
    expect(isTerrainId(123)).toBe(false);
  });

  it('resolves valid terrain ID to registered definition', () => {
    const resolved = resolveTerrainPresentation('alien-crust');
    expect(resolved).toBe(ALIEN_CRUST_TERRAIN);
  });

  it('safely falls back to default terrain for unknown or undefined terrain IDs', () => {
    const fallbackUndefined = resolveTerrainPresentation(undefined);
    expect(fallbackUndefined).toBe(ALIEN_CRUST_TERRAIN);

    const fallbackUnknown = resolveTerrainPresentation('unknown-id' as unknown as 'alien-crust');
    expect(fallbackUnknown).toBe(ALIEN_CRUST_TERRAIN);
  });
});
