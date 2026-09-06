import { getDefaultMusicUrl } from '../audio';

export type MusicTrackId = string;

export interface MusicTrackDefinition {
  id: MusicTrackId;
  name: string;
  url: string;
}

export const DEFAULT_MUSIC_TRACK_ID: MusicTrackId = 'weightless-space';

export function getMusicCatalog(): Record<MusicTrackId, MusicTrackDefinition> {
  return {
    'weightless-space': {
      id: 'weightless-space',
      name: 'Weightless Space',
      url: getDefaultMusicUrl(),
    },
  };
}

export function getMusicTrack(id: MusicTrackId): MusicTrackDefinition | undefined {
  return getMusicCatalog()[id];
}

export function isMusicTrackId(id: string): id is MusicTrackId {
  return Object.prototype.hasOwnProperty.call(getMusicCatalog(), id);
}

export function resolveMusicTrack(id?: string): MusicTrackDefinition {
  const catalog = getMusicCatalog();
  if (id && isMusicTrackId(id)) {
    return catalog[id];
  }
  return catalog[DEFAULT_MUSIC_TRACK_ID];
}
