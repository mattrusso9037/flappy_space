import { MusicTrackId } from '../../audio/musicCatalog';
import { DialogueId } from '../dialogue/dialogueTypes';

export type CutsceneId = string;

export interface CameraAction {
  x?: number;
  y?: number;
  zoom?: number;
}

export type CutsceneStep =
  | {
      type: 'wait';
      duration: number;
    }
  | {
      type: 'dialogue';
      dialogueId: DialogueId;
    }
  | {
      type: 'fade';
      direction: 'in' | 'out';
      duration: number;
    }
  | {
      type: 'camera';
      action: CameraAction;
      duration: number;
    }
  | {
      type: 'music';
      musicId: MusicTrackId;
    };

export interface CutsceneDefinition {
  id: CutsceneId;
  steps: CutsceneStep[];
}
