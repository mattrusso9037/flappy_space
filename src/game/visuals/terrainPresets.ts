import { INK } from './tokens';

export type TerrainId = 'alien-crust';

export interface TerrainPresentationDefinition {
  id: TerrainId;
  name: string;
  bedrockColor: number;
  strataColor: number;
  crestColor: number;
  accentColor: number;
  hazeColor: string;
}

export const ALIEN_CRUST_TERRAIN: TerrainPresentationDefinition = {
  id: 'alien-crust',
  name: 'Alien Crust',
  bedrockColor: INK.void,
  strataColor: INK.hull,
  crestColor: INK.violet,
  accentColor: INK.cyan,
  hazeColor: '#a855f7',
};

export const TERRAIN_PRESETS: Record<TerrainId, TerrainPresentationDefinition> = {
  'alien-crust': ALIEN_CRUST_TERRAIN,
};

export function isTerrainId(id: unknown): id is TerrainId {
  return typeof id === 'string' && id in TERRAIN_PRESETS;
}

export function resolveTerrainPresentation(id?: TerrainId): TerrainPresentationDefinition {
  if (id && isTerrainId(id)) {
    return TERRAIN_PRESETS[id];
  }
  return ALIEN_CRUST_TERRAIN;
}
