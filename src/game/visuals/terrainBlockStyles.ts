/**
 * Canonical presentation style registry for authored terrain blocks (ledges, platforms, barriers).
 * Decouples visual art assets from canonical gameplay collision geometry.
 */

export type TerrainBlockStyleId = 'alien-platform';

export interface TerrainBlockStyleDefinition {
  id: TerrainBlockStyleId;
  name: string;
  leftCapAsset: string;
  middleAsset: string;
  rightCapAsset: string;
  /** Reference cap width in source texture space. */
  capWidth: number;
  /** Total height of the visual asset in source texture space. */
  assetHeight: number;
  /** Vertical offset from the visual asset top to the flat walking surface. */
  surfaceOffsetY: number;
}

export const ALIEN_PLATFORM_STYLE: TerrainBlockStyleDefinition = {
  id: 'alien-platform',
  name: 'Alien Ledge Platform',
  leftCapAsset: 'terrain-alien-platform-left',
  middleAsset: 'terrain-alien-platform-middle',
  rightCapAsset: 'terrain-alien-platform-right',
  capWidth: 100,
  assetHeight: 238,
  surfaceOffsetY: 80,
};

export const TERRAIN_BLOCK_STYLES: Record<TerrainBlockStyleId, TerrainBlockStyleDefinition> = {
  'alien-platform': ALIEN_PLATFORM_STYLE,
};

export function isTerrainBlockStyleId(id: unknown): id is TerrainBlockStyleId {
  return typeof id === 'string' && id in TERRAIN_BLOCK_STYLES;
}

export function resolveTerrainBlockStyle(id?: string): TerrainBlockStyleDefinition | null {
  if (id && isTerrainBlockStyleId(id)) {
    return TERRAIN_BLOCK_STYLES[id];
  }
  return null;
}
