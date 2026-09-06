export type VideoCutsceneId = string;

export interface VideoCutsceneDefinition {
  id: VideoCutsceneId;
  src: string;
  poster?: string;
  skippable?: boolean;
  preload?: 'metadata' | 'auto' | 'none';
}
