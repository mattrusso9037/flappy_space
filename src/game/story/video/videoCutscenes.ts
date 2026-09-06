import { VideoCutsceneDefinition, VideoCutsceneId } from './videoCutsceneTypes';

/**
 * Reference/fixture definition for testing.
 * Not registered in production VIDEO_CUTSCENE_REGISTRY by default to avoid promising unavailable media.
 */
export const OPENING_TRANSMISSION_VIDEO: VideoCutsceneDefinition = {
  id: 'opening-transmission',
  src: '/cutscenes/opening-transmission.mp4',
  skippable: true,
  preload: 'metadata',
};

const VIDEO_CUTSCENE_REGISTRY: Map<VideoCutsceneId, VideoCutsceneDefinition> = new Map();

export function registerVideoCutscene(definition: VideoCutsceneDefinition): void {
  VIDEO_CUTSCENE_REGISTRY.set(definition.id, definition);
}

export function getVideoCutscene(id: VideoCutsceneId): VideoCutsceneDefinition | undefined {
  return VIDEO_CUTSCENE_REGISTRY.get(id);
}

export function hasVideoCutscene(id: VideoCutsceneId): boolean {
  return VIDEO_CUTSCENE_REGISTRY.has(id);
}

export function getAllVideoCutscenes(): VideoCutsceneDefinition[] {
  return Array.from(VIDEO_CUTSCENE_REGISTRY.values());
}

export function clearVideoCutsceneRegistry(): void {
  VIDEO_CUTSCENE_REGISTRY.clear();
}

export interface VideoCutsceneValidationOptions {
  /**
   * Optional asset existence predicate, useful for development, build, or test validation
   * without introducing browser-incompatible filesystem calls.
   */
  assetExists?: (path: string) => boolean;
}

export function validateVideoCutsceneDefinition(
  video: VideoCutsceneDefinition,
  options?: VideoCutsceneValidationOptions
): string[] {
  const errors: string[] = [];
  if (!video.id || typeof video.id !== 'string') {
    errors.push('Video cutscene definition must have a non-empty string id.');
  }
  if (!video.src || typeof video.src !== 'string') {
    errors.push(`Video cutscene "${video.id}" must have a non-empty string src URL.`);
  } else if (options?.assetExists && !options.assetExists(video.src)) {
    errors.push(`Video cutscene "${video.id}" source asset not found: "${video.src}".`);
  }
  if (video.poster && options?.assetExists && !options.assetExists(video.poster)) {
    errors.push(`Video cutscene "${video.id}" poster asset not found: "${video.poster}".`);
  }
  return errors;
}
