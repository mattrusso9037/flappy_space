export type DialogueId = string;

export interface DialogueLine {
  speaker: string;
  text: string;
  portraitId?: string;
}

export interface DialogueDefinition {
  id: DialogueId;
  lines: DialogueLine[];
}
