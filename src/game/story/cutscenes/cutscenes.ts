import { OPENING_SPACEWALK } from './openingSpacewalk';
import { validateScene } from './sceneTypes';
import { CutsceneDefinition, CutsceneId } from './cutsceneTypes';
import { isMusicTrackId } from '../../audio/musicCatalog';
import { hasDialogue } from '../dialogue/dialogues';

export const FIRST_SIGNAL_CUTSCENE: CutsceneDefinition = {
  id: 'first-signal',
  steps: [
    { type: 'fade', direction: 'in', duration: 0.5 },
    { type: 'wait', duration: 0.3 },
    { type: 'dialogue', dialogueId: 'unknown-signal' },
    { type: 'camera', action: { x: 30, y: -15, zoom: 1.05 }, duration: 1.0 },
    { type: 'fade', direction: 'out', duration: 0.5 },
  ],
};

const CUTSCENE_REGISTRY: Map<CutsceneId, CutsceneDefinition> = new Map();

CUTSCENE_REGISTRY.set(FIRST_SIGNAL_CUTSCENE.id, FIRST_SIGNAL_CUTSCENE);
CUTSCENE_REGISTRY.set(OPENING_SPACEWALK.id, OPENING_SPACEWALK);

export function registerCutscene(definition: CutsceneDefinition): void {
  CUTSCENE_REGISTRY.set(definition.id, definition);
}

export function getCutscene(id: CutsceneId): CutsceneDefinition | undefined {
  return CUTSCENE_REGISTRY.get(id);
}

export function hasCutscene(id: CutsceneId): boolean {
  return CUTSCENE_REGISTRY.has(id);
}

export function getAllCutscenes(): CutsceneDefinition[] {
  return Array.from(CUTSCENE_REGISTRY.values());
}

export function clearCutsceneRegistry(): void {
  CUTSCENE_REGISTRY.clear();
  CUTSCENE_REGISTRY.set(FIRST_SIGNAL_CUTSCENE.id, FIRST_SIGNAL_CUTSCENE);
  CUTSCENE_REGISTRY.set(OPENING_SPACEWALK.id, OPENING_SPACEWALK);
}

export function validateCutsceneDefinition(cutscene: CutsceneDefinition): string[] {
  const errors: string[] = [];
  if (!cutscene.id || typeof cutscene.id !== 'string') {
    errors.push('Cutscene definition must have a non-empty string id.');
  }
  if (!Array.isArray(cutscene.steps) || cutscene.steps.length === 0) {
    errors.push(`Cutscene "${cutscene.id}" must contain at least one step.`);
  } else {
    cutscene.steps.forEach((step, index) => {
      const stepPrefix = `Cutscene "${cutscene.id}" step ${index} (${step.type}):`;
      switch (step.type) {
        case 'scene':
          if (!Number.isFinite(step.duration) || step.duration <= 0) errors.push(`${stepPrefix} duration must be positive and finite.`);
          errors.push(...validateScene(step.scene, step.duration).map(error => `${stepPrefix} ${error}`));
          break;
        case 'wait':
          if (typeof step.duration !== 'number' || step.duration <= 0) {
            errors.push(`${stepPrefix} duration must be a positive number.`);
          }
          break;
        case 'dialogue':
          if (!step.dialogueId || typeof step.dialogueId !== 'string') {
            errors.push(`${stepPrefix} must have a non-empty dialogueId.`);
          } else if (!hasDialogue(step.dialogueId)) {
            errors.push(`${stepPrefix} references unregistered dialogue "${step.dialogueId}".`);
          }
          break;
        case 'fade':
          if (step.direction !== 'in' && step.direction !== 'out') {
            errors.push(`${stepPrefix} direction must be 'in' or 'out'.`);
          }
          if (typeof step.duration !== 'number' || step.duration <= 0) {
            errors.push(`${stepPrefix} duration must be a positive number.`);
          }
          break;
        case 'camera':
          if (typeof step.duration !== 'number' || step.duration <= 0) {
            errors.push(`${stepPrefix} duration must be a positive number.`);
          }
          if (!step.action || typeof step.action !== 'object') {
            errors.push(`${stepPrefix} action must be an object.`);
          }
          break;
        case 'music':
          if (!step.musicId || !isMusicTrackId(step.musicId)) {
            errors.push(`${stepPrefix} references invalid music track "${step.musicId}".`);
          }
          break;
        default:
          errors.push(`${stepPrefix} unknown cutscene step type.`);
      }
    });
  }
  return errors;
}
