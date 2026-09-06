import { CampaignDefinition, StoryTransition } from './campaignTypes';
import { isEnvironmentId } from '../environments/environments';
import { isMusicTrackId } from '../audio/musicCatalog';
import { hasDialogue } from '../story/dialogue/dialogues';
import { hasCutscene } from '../story/cutscenes/cutscenes';
import { hasVideoCutscene } from '../story/video/videoCutscenes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Reusable validator for campaign and level definitions.
 * Catches structural, referential, and numerical configuration errors early.
 */
export function validateCampaignDefinition(campaign: CampaignDefinition): ValidationResult {
  const errors: string[] = [];

  if (!campaign.id || typeof campaign.id !== 'string') {
    errors.push('Campaign must have a non-empty string id.');
  }

  if (!campaign.name || typeof campaign.name !== 'string') {
    errors.push('Campaign must have a non-empty string name.');
  }

  if (!campaign.startingLevelId || !campaign.levels[campaign.startingLevelId]) {
    errors.push(
      `Campaign starting level "${campaign.startingLevelId}" does not exist in campaign levels.`
    );
  }

  const levelIds = Object.keys(campaign.levels);
  if (levelIds.length === 0) {
    errors.push('Campaign must define at least one level.');
  }

  for (const [key, level] of Object.entries(campaign.levels)) {
    const prefix = `Level "${key}":`;

    if (level.id !== key) {
      errors.push(`${prefix} Record key "${key}" does not match level.id "${level.id}".`);
    }

    if (!level.name || typeof level.name !== 'string') {
      errors.push(`${prefix} Level must have a non-empty string name.`);
    }

    // Presentation validation
    if (!level.presentation) {
      errors.push(`${prefix} Missing presentation definition.`);
    } else {
      if (!level.presentation.environmentId || !isEnvironmentId(level.presentation.environmentId)) {
        errors.push(
          `${prefix} References invalid environmentId "${level.presentation.environmentId}".`
        );
      }
      if (
        level.presentation.musicId !== undefined &&
        !isMusicTrackId(level.presentation.musicId)
      ) {
        errors.push(`${prefix} References invalid musicId "${level.presentation.musicId}".`);
      }
    }

    // Gameplay validation
    if (!level.gameplay) {
      errors.push(`${prefix} Missing gameplay definition.`);
    } else {
      const { speeds, spawnInterval, orbSpawnChance, orbsRequired, timeLimit, obstacles } =
        level.gameplay;

      if (!speeds || speeds.planet <= 0 || speeds.secondaryPlanet <= 0 || speeds.orb <= 0) {
        errors.push(`${prefix} Gameplay speeds must be positive numbers.`);
      }

      if (typeof spawnInterval !== 'number' || spawnInterval <= 0) {
        errors.push(`${prefix} spawnInterval must be a positive number.`);
      }

      if (
        typeof orbSpawnChance !== 'number' ||
        orbSpawnChance < 0 ||
        orbSpawnChance > 1 ||
        Number.isNaN(orbSpawnChance)
      ) {
        errors.push(`${prefix} orbSpawnChance must be a number between 0 and 1.`);
      }

      if (
        typeof orbsRequired !== 'number' ||
        orbsRequired <= 0 ||
        !Number.isInteger(orbsRequired)
      ) {
        errors.push(`${prefix} orbsRequired must be a positive integer.`);
      }

      if (typeof timeLimit !== 'number' || timeLimit <= 0) {
        errors.push(`${prefix} timeLimit must be a positive number.`);
      }

      // Obstacles validation
      if (!obstacles) {
        errors.push(`${prefix} Missing obstacles configuration.`);
      } else {
        if (typeof obstacles.minPlanetRadius !== 'number' || obstacles.minPlanetRadius <= 0) {
          errors.push(`${prefix} obstacles.minPlanetRadius must be a positive number.`);
        }
        if (
          typeof obstacles.maxPlanetRadius !== 'number' ||
          obstacles.maxPlanetRadius < obstacles.minPlanetRadius
        ) {
          errors.push(
            `${prefix} obstacles.maxPlanetRadius must be greater than or equal to minPlanetRadius.`
          );
        }
        if (
          typeof obstacles.secondaryPlanetChance !== 'number' ||
          obstacles.secondaryPlanetChance < 0 ||
          obstacles.secondaryPlanetChance > 1
        ) {
          errors.push(
            `${prefix} obstacles.secondaryPlanetChance must be a number between 0 and 1.`
          );
        }
      }

      // Ground validation
      if (level.gameplay.ground !== undefined) {
        const ground = level.gameplay.ground;
        if (typeof ground.enabled !== 'boolean') {
          errors.push(`${prefix} ground.enabled must be a boolean.`);
        }
        if (ground.height !== undefined && (typeof ground.height !== 'number' || ground.height <= 0 || Number.isNaN(ground.height))) {
          errors.push(`${prefix} ground.height must be a positive number.`);
        }
      }
    }

    // Progression link
    if (level.nextLevelId !== undefined) {
      if (!campaign.levels[level.nextLevelId]) {
        errors.push(
          `${prefix} nextLevelId "${level.nextLevelId}" does not exist in campaign levels.`
        );
      }
    }

    // Story transitions
    if (level.intro) {
      errors.push(...validateStoryTransition(level.intro, `${prefix} intro`));
    }
    if (level.outro) {
      errors.push(...validateStoryTransition(level.outro, `${prefix} outro`));
    }
  }

  // Campaign ending
  if (campaign.ending) {
    errors.push(...validateStoryTransition(campaign.ending, 'Campaign ending'));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateStoryTransition(transition: StoryTransition, contextDesc: string): string[] {
  const errors: string[] = [];
  if (!transition || typeof transition !== 'object') {
    errors.push(`${contextDesc} transition must be an object.`);
    return errors;
  }
  if (!transition.id || typeof transition.id !== 'string') {
    errors.push(`${contextDesc} transition must have a non-empty string id.`);
    return errors;
  }
  switch (transition.type) {
    case 'dialogue':
      if (!hasDialogue(transition.id)) {
        errors.push(`${contextDesc} references unregistered dialogue "${transition.id}".`);
      }
      break;
    case 'cutscene':
      if (!hasCutscene(transition.id)) {
        errors.push(`${contextDesc} references unregistered cutscene "${transition.id}".`);
      }
      break;
    case 'video':
      if (!hasVideoCutscene(transition.id)) {
        errors.push(`${contextDesc} references unregistered video cutscene "${transition.id}".`);
      }
      break;
    default:
      errors.push(`${contextDesc} transition must have type 'dialogue', 'cutscene', or 'video'.`);
  }
  return errors;
}
