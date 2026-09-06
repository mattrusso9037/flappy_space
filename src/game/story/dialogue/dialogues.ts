import {
  DialogueDefinition,
  DialogueId,
  DialogueIds,
  CharacterIds,
} from './dialogueTypes';
import { isCharacterId } from '../characters/characters';
import { EMOTION_COORDINATES } from '../../../components/story/dialogueAvatars';

export const UNKNOWN_SIGNAL_DIALOGUE: DialogueDefinition = {
  id: DialogueIds.UNKNOWN_SIGNAL,
  lines: [
    {
      characterId: CharacterIds.AI,
      speaker: '{aiName}',
      text: 'Telemetry detects an anomalous subspace frequency ahead. Stay alert, {astronautName}.',
    },
    {
      characterId: CharacterIds.ASTRONAUT,
      speaker: '{astronautName}',
      text: 'Copy that, {aiName}. Thrusters engaged. Scanning flight corridor.',
      portraitId: 'neutral',
    },
    {
      characterId: CharacterIds.AI,
      speaker: '{aiName}',
      text: 'Energy signatures fluctuating. Maintain orbital stability.',
    },
  ],
};

export const LUNAR_ARRIVAL_DIALOGUE: DialogueDefinition = {
  id: DialogueIds.LUNAR_ARRIVAL,
  lines: [
    {
      characterId: CharacterIds.ASTRONAUT,
      speaker: '{astronautName}',
      text: 'Approaching lunar perimeter. Gravitational distortion intensifying.',
      portraitId: 'alert',
    },
    {
      characterId: CharacterIds.AI,
      speaker: '{aiName}',
      text: 'Radar sweep confirms high-density celestial debris field. Navigate carefully, {astronautName}.',
    },
  ],
};

export const MATTER_GUN_FOUND_DIALOGUE: DialogueDefinition = {
  id: DialogueIds.MATTER_GUN_FOUND,
  lines: [
    {
      characterId: CharacterIds.ASTRONAUT,
      speaker: '{astronautName}',
      text: 'Oh shoot, my matter gun...',
      portraitId: 'neutral',
    },
    {
      characterId: CharacterIds.ASTRONAUT,
      speaker: '{astronautName}',
      text: 'Some of my stuff must have gotten sucked in too.',
      portraitId: 'puzzled',
    },
    {
      characterId: CharacterIds.ASTRONAUT,
      speaker: '{astronautName}',
      text: 'I wonder what else is lying around...',
      portraitId: 'curious',
    },
    {
      characterId: CharacterIds.AI,
      speaker: '{aiName}',
      text: '[Matter Gun]: It creates... matter. The geniuses behind this thing could only figure out how to create tiny platforms. I\'m sure you\'ll figure out what to do with it... Or not...',
    },
  ],
};

const DIALOGUE_REGISTRY: Map<DialogueId, DialogueDefinition> = new Map();

// Register canonical built-in dialogues
DIALOGUE_REGISTRY.set(UNKNOWN_SIGNAL_DIALOGUE.id, UNKNOWN_SIGNAL_DIALOGUE);
DIALOGUE_REGISTRY.set(LUNAR_ARRIVAL_DIALOGUE.id, LUNAR_ARRIVAL_DIALOGUE);
DIALOGUE_REGISTRY.set(MATTER_GUN_FOUND_DIALOGUE.id, MATTER_GUN_FOUND_DIALOGUE);

export function registerDialogue(definition: DialogueDefinition): void {
  DIALOGUE_REGISTRY.set(definition.id, definition);
}

export function getDialogue(id: DialogueId): DialogueDefinition | undefined {
  return DIALOGUE_REGISTRY.get(id);
}

export function hasDialogue(id: DialogueId): boolean {
  return DIALOGUE_REGISTRY.has(id);
}

export function getAllDialogues(): DialogueDefinition[] {
  return Array.from(DIALOGUE_REGISTRY.values());
}

export function clearDialogueRegistry(): void {
  DIALOGUE_REGISTRY.clear();
  DIALOGUE_REGISTRY.set(UNKNOWN_SIGNAL_DIALOGUE.id, UNKNOWN_SIGNAL_DIALOGUE);
  DIALOGUE_REGISTRY.set(LUNAR_ARRIVAL_DIALOGUE.id, LUNAR_ARRIVAL_DIALOGUE);
  DIALOGUE_REGISTRY.set(MATTER_GUN_FOUND_DIALOGUE.id, MATTER_GUN_FOUND_DIALOGUE);
}

export function validateDialogueDefinition(dialogue: DialogueDefinition): string[] {
  const errors: string[] = [];
  if (!dialogue.id || typeof dialogue.id !== 'string') {
    errors.push('Dialogue definition must have a non-empty string id.');
  }
  if (!Array.isArray(dialogue.lines) || dialogue.lines.length === 0) {
    errors.push(`Dialogue "${dialogue.id}" must contain at least one dialogue line.`);
  } else {
    dialogue.lines.forEach((line, index) => {
      if (!line.speaker || typeof line.speaker !== 'string') {
        errors.push(`Dialogue "${dialogue.id}" line ${index} missing valid speaker.`);
      }
      if (!line.text || typeof line.text !== 'string') {
        errors.push(`Dialogue "${dialogue.id}" line ${index} missing valid text.`);
      }
      if (line.characterId && !isCharacterId(line.characterId)) {
        errors.push(
          `Dialogue "${dialogue.id}" line ${index} has invalid characterId "${String(line.characterId)}". Only "astronaut" and "ai" are supported.`
        );
      }
      if (line.portraitId && !(line.portraitId in EMOTION_COORDINATES)) {
        errors.push(
          `Dialogue "${dialogue.id}" line ${index} has invalid portraitId "${String(line.portraitId)}". Must be a valid Astronaut emotion.`
        );
      }
    });
  }
  return errors;
}
