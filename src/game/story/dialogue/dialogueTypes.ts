import {
  CharacterId,
  CharacterIds,
  EmotionId,
} from '../characters/characterTypes';
import { resolveCharacterName } from '../characters/characters';

export {
  CharacterIds,
};

export type {
  CharacterId,
  EmotionId,
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
  characterId: CharacterId;
  text: string;
  emotion?: EmotionId;
}

export interface DialogueDefinition {
  id: DialogueId;
  lines: DialogueLine[];
}

export interface DialogueVariables {
  astronautName?: string;
  aiName?: string;
  useToolKey?: string;
}

/**
 * Resolves the small, explicit set of dynamic values supported by dialogue text.
 */
export function resolveDialogueText(
  text: string,
  variables?: DialogueVariables
): string {
  const defaults: Pick<DialogueVariables, 'astronautName' | 'aiName'> = {
    astronautName: resolveCharacterName(CharacterIds.ASTRONAUT, variables),
    aiName: resolveCharacterName(CharacterIds.AI, variables),
  };

  return text.replace(/\{(\w+)\}/g, (match, varName: string) => {
    const variableName = varName as keyof DialogueVariables;
    if (variables && variables[variableName] !== undefined) {
      return variables[variableName]!;
    }
    if (variableName === 'astronautName' || variableName === 'aiName') {
      return defaults[variableName] ?? match;
    }
    return match;
  });
}

export function resolveDialogueSpeaker(
  characterId: CharacterId,
  variables?: DialogueVariables
): string {
  return resolveCharacterName(characterId, variables);
}
