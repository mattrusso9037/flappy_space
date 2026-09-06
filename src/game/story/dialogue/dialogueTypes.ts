import { getUseToolKeyLabel } from '../../inputManager';
import {
  CharacterId,
  CharacterIds,
  PortraitId,
  AstronautEmotion,
} from '../characters/characterTypes';

export {
  CharacterIds,
};

export type {
  CharacterId,
  PortraitId,
  AstronautEmotion,
};

/**
 * Centralized Canonical Dialogue Identifiers
 */
export const DialogueIds = {
  UNKNOWN_SIGNAL: 'unknown-signal',
  LUNAR_ARRIVAL: 'lunar-arrival',
  MATTER_GUN_FOUND: 'matter-gun-found',
} as const;

export type CanonicalDialogueId = (typeof DialogueIds)[keyof typeof DialogueIds];

/**
 * Strongly-typed dialogue ID.
 * Autocompletes canonical IDs while remaining flexible for dynamic/test dialogues.
 */
export type DialogueId = CanonicalDialogueId | (string & Record<never, never>);

export interface DialogueLine {
  characterId?: CharacterId;
  speaker: string;
  text: string;
  portraitId?: PortraitId;
}

export interface DialogueDefinition {
  id: DialogueId;
  lines: DialogueLine[];
}

export interface DialogueVariables {
  [key: string]: string | undefined;
}

/**
 * Resolves template placeholders like {useToolKey}, {toolKey}, {buildKey}, {key}
 * in dialogue text against default dynamic game variables or custom overrides.
 */
export function resolveDialogueText(
  text: string,
  variables?: DialogueVariables
): string {
  const toolKey = getUseToolKeyLabel();
  const defaults: Record<string, string> = {
    astronautName: 'Atom',
    ASTRONAUT_NAME: 'Atom',
    aiName: 'Artimus',
    AI_NAME: 'Artimus',
    useToolKey: toolKey,
    USE_TOOL_KEY: toolKey,
    toolKey: toolKey,
    TOOL_KEY: toolKey,
    buildKey: toolKey,
    BUILD_KEY: toolKey,
    key: toolKey,
    KEY: toolKey,
  };

  return text.replace(/\{(\w+)\}/g, (match, varName) => {
    if (variables && variables[varName] !== undefined) {
      return variables[varName]!;
    }
    if (varName in defaults) {
      return defaults[varName];
    }
    return match;
  });
}
