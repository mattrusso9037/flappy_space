import { DialogueDefinition, DialogueId } from './dialogueTypes';

export const UNKNOWN_SIGNAL_DIALOGUE: DialogueDefinition = {
  id: 'unknown-signal',
  lines: [
    {
      speaker: 'Mission Control',
      text: 'Pilot, telemetry detects an anomalous subspace frequency ahead. Stay alert.',
      portraitId: 'control',
    },
    {
      speaker: 'Spaceman',
      text: 'Copy that, Control. Thrusters engaged. Scanning flight corridor.',
      portraitId: 'pilot',
    },
    {
      speaker: 'Flight AI',
      text: 'Energy signatures fluctuating. Maintain orbital stability.',
      portraitId: 'ai',
    },
  ],
};

export const LUNAR_ARRIVAL_DIALOGUE: DialogueDefinition = {
  id: 'lunar-arrival',
  lines: [
    {
      speaker: 'Spaceman',
      text: 'Approaching lunar perimeter. Gravitational distortion intensifying.',
      portraitId: 'pilot',
    },
    {
      speaker: 'Mission Control',
      text: 'Radar sweep confirms high-density celestial debris field. Navigate carefully.',
      portraitId: 'control',
    },
  ],
};

const DIALOGUE_REGISTRY: Map<DialogueId, DialogueDefinition> = new Map();

// Register canonical built-in dialogues
DIALOGUE_REGISTRY.set(UNKNOWN_SIGNAL_DIALOGUE.id, UNKNOWN_SIGNAL_DIALOGUE);
DIALOGUE_REGISTRY.set(LUNAR_ARRIVAL_DIALOGUE.id, LUNAR_ARRIVAL_DIALOGUE);

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
    });
  }
  return errors;
}
