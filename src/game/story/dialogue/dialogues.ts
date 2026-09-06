import {
  DialogueDefinition,
  DialogueId,
  DialogueIds,
  CharacterIds,
} from './dialogueTypes';
import { isCharacterId, supportsCharacterEmotion } from '../characters/characters';

export const UNKNOWN_SIGNAL_DIALOGUE: DialogueDefinition = {
  id: DialogueIds.UNKNOWN_SIGNAL,
  lines: [
    {
      characterId: CharacterIds.AI,
      text: 'Telemetry detects an anomalous subspace frequency ahead. Stay alert, {astronautName}.',
    },
    {
      characterId: CharacterIds.ASTRONAUT,
      text: 'Copy that, {aiName}. Thrusters engaged. Scanning flight corridor.',
      emotion: 'neutral',
    },
    {
      characterId: CharacterIds.AI,
      text: 'Energy signatures fluctuating. Maintain orbital stability.',
    },
  ],
};

export const LUNAR_ARRIVAL_DIALOGUE: DialogueDefinition = {
  id: DialogueIds.LUNAR_ARRIVAL,
  lines: [
    {
      characterId: CharacterIds.ASTRONAUT,
      text: 'Approaching lunar perimeter. Gravitational distortion intensifying.',
      emotion: 'alert',
    },
    {
      characterId: CharacterIds.AI,
      text: 'Radar sweep confirms high-density celestial debris field. Navigate carefully, {astronautName}.',
    },
  ],
};

export const MATTER_GUN_FOUND_DIALOGUE: DialogueDefinition = {
  id: DialogueIds.MATTER_GUN_FOUND,
  lines: [
    {
      characterId: CharacterIds.ASTRONAUT,
      text: 'Oh shoot, my matter gun...',
      emotion: 'neutral',
    },
    {
      characterId: CharacterIds.ASTRONAUT,
      text: 'Some of my stuff must have gotten sucked into this thing too.',
      emotion: 'puzzled',
    },
    {
      characterId: CharacterIds.ASTRONAUT,
      text: 'I wonder what else is lying around...',
      emotion: 'curious',
    },
    {
      characterId: CharacterIds.AI,
      text: '[Matter Gun]: It creates... well, matter. The geniuses behind this thing could only figure out how to make tiny platforms. I\'m sure you\'ll figure out what to do with it. Or not...',
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
      if (!line.text || typeof line.text !== 'string') {
        errors.push(`Dialogue "${dialogue.id}" line ${index} missing valid text.`);
      }
      if (!isCharacterId(line.characterId)) {
        errors.push(
          `Dialogue "${dialogue.id}" line ${index} has invalid characterId "${String(line.characterId)}". Only "astronaut" and "ai" are supported.`
        );
      }
      if (line.emotion && isCharacterId(line.characterId) && !supportsCharacterEmotion(line.characterId, line.emotion)) {
        errors.push(
          `Dialogue "${dialogue.id}" line ${index} has unsupported emotion "${String(line.emotion)}" for character "${line.characterId}".`
        );
      }
    });
  }
  return errors;
}
