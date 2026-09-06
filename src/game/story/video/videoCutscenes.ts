import { VideoCutsceneDefinition, VideoCutsceneId } from './videoCutsceneTypes';

export const OPENING_TRANSMISSION_VIDEO: VideoCutsceneDefinition = {
  id: 'opening-transmission',
  src: '/cutscenes/opening-transmission.mp4',
  skippable: true,
  preload: 'metadata',
};

const VIDEO_CUTSCENE_REGISTRY: Map<VideoCutsceneId, VideoCutsceneDefinition> = new Map();

VIDEO_CUTSCENE_REGISTRY.set(OPENING_TRANSMISSION_VIDEO.id, OPENING_TRANSMISSION_VIDEO);

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
  VIDEO_CUTSCENE_REGISTRY.set(OPENING_TRANSMISSION_VIDEO.id, OPENING_TRANSMISSION_VIDEO);
}

export function validateVideoCutsceneDefinition(video: VideoCutsceneDefinition): string[] {
  const errors: string[] = [];
  if (!video.id || typeof video.id !== 'string') {
    errors.push('Video cutscene definition must have a non-empty string id.');
  }
  if (!video.src || typeof video.src !== 'string') {
    errors.push(`Video cutscene "${video.id}" must have a non-empty string src URL.`);
  }
  return errors;
}
