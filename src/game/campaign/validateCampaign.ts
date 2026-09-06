import { CampaignDefinition, StoryTransition } from './campaignTypes';
import { isEnvironmentId } from '../environments/environments';
import { isMusicTrackId } from '../audio/musicCatalog';
import { isTerrainId } from '../visuals/terrainPresets';
import { ASTRONAUT, GAME_HEIGHT, GAME_WIDTH } from '../config';

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
      if (
        level.presentation.terrainId !== undefined &&
        !isTerrainId(level.presentation.terrainId)
      ) {
        errors.push(`${prefix} References invalid terrainId "${level.presentation.terrainId}".`);
      }
    }

    // Gameplay validation
    if (!level.gameplay) {
      errors.push(`${prefix} Missing gameplay definition.`);
    } else {
      const { speeds, spawnInterval, orbsRequired, timeLimit, obstacles, orbs } =
        level.gameplay;

      if (!speeds || speeds.planet <= 0 || speeds.secondaryPlanet <= 0 || speeds.orb <= 0) {
        errors.push(`${prefix} Gameplay speeds must be positive numbers.`);
      }

      if (typeof spawnInterval !== 'number' || spawnInterval <= 0) {
        errors.push(`${prefix} spawnInterval must be a positive number.`);
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
        if (obstacles.enabled !== undefined && typeof obstacles.enabled !== 'boolean') {
          errors.push(`${prefix} obstacles.enabled must be a boolean.`);
        }
        if (obstacles.enabled !== false) {
          if (typeof obstacles.minPlanetRadius !== 'number' || obstacles.minPlanetRadius <= 0) {
            errors.push(`${prefix} obstacles.minPlanetRadius must be a positive number.`);
          }
          if (
            typeof obstacles.maxPlanetRadius !== 'number' ||
            obstacles.maxPlanetRadius < (obstacles.minPlanetRadius ?? 0)
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
      }

      // Ground validation
      if (level.gameplay.ground !== undefined) {
        const ground = level.gameplay.ground;
        if (typeof ground.enabled !== 'boolean') {
          errors.push(`${prefix} ground.enabled must be a boolean.`);
        }
        if (
          typeof ground.height !== 'number' ||
          !Number.isFinite(ground.height) ||
          ground.height <= 0
        ) {
          errors.push(`${prefix} ground.height must be a positive finite number.`);
        } else if (ground.height >= GAME_HEIGHT) {
          errors.push(`${prefix} ground.height must be less than GAME_HEIGHT (${GAME_HEIGHT}).`);
        } else if (GAME_HEIGHT - ground.height < 100) {
          errors.push(
            `${prefix} ground.height (${ground.height}) leaves an unviable gameplay corridor of ${GAME_HEIGHT - ground.height}px (minimum 100px required).`
          );
        }
      }

      // Movement validation
      if (level.gameplay.movement !== undefined) {
        const movement = level.gameplay.movement;
        if (movement.mode !== 'flight' && movement.mode !== 'ground') {
          errors.push(`${prefix} movement.mode must be 'flight' or 'ground'.`);
        }
        if (movement.mode === 'ground') {
          if (
            typeof movement.maxThrustCharges !== 'number' ||
            !Number.isFinite(movement.maxThrustCharges) ||
            movement.maxThrustCharges <= 0 ||
            !Number.isInteger(movement.maxThrustCharges)
          ) {
            errors.push(`${prefix} ground movement requires a positive integer maxThrustCharges.`);
          }
        }
      }

      const terrainBlocks = level.gameplay.terrainBlocks;
      if (terrainBlocks !== undefined) {
        if (!level.gameplay.ground?.enabled || level.gameplay.movement?.mode !== 'ground' || !level.gameplay.world) {
          errors.push(`${prefix} terrainBlocks requires ground, ground movement and a world.`);
        }
        if (!Array.isArray(terrainBlocks)) {
          errors.push(`${prefix} terrainBlocks must be an array.`);
        } else {
          const ids = new Set<string>();
          for (const [index, block] of terrainBlocks.entries()) {
            const b = block?.bounds;
            if (!block || typeof block.id !== 'string' || !block.id.trim() || ids.has(block.id) ||
                typeof block.diggable !== 'boolean' || !b ||
                ![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
                b.width <= 0 || b.height <= 0 || b.x < 0 || b.y < 0 ||
                b.x + b.width > (level.gameplay.world?.width ?? GAME_WIDTH) ||
                b.y + b.height > GAME_HEIGHT - (level.gameplay.ground?.height ?? 0)) {
              errors.push(`${prefix} terrain block requires unique id, explicit diggable flag and valid world bounds above ground.`);
              continue;
            }
            ids.add(block.id);
            const overlaps = (r: { x: number; y: number; width: number; height: number }) =>
              b.x < r.x + r.width && b.x + b.width > r.x && b.y < r.y + r.height && b.y + b.height > r.y;
            if (terrainBlocks.slice(0, index).some(other => other?.bounds && overlaps(other.bounds))) {
              errors.push(`${prefix} terrain blocks must not overlap.`);
            }
            if (overlaps({ x: ASTRONAUT.startX - ASTRONAUT.body.width / 2,
              y: ASTRONAUT.startY - ASTRONAUT.body.height / 2, ...ASTRONAUT.body })) {
              errors.push(`${prefix} terrain blocks must not overlap the astronaut spawn.`);
            }
            if (level.gameplay.orbs?.placements?.some(orb => overlaps({ x: orb.x - 14, y: orb.y - 14, width: 28, height: 28 }))) {
              errors.push(`${prefix} terrain blocks must not overlap authored pickups.`);
            }
          }
        }
      }

      const tools = level.gameplay.tools;
      if (tools !== undefined) {
        if (!level.gameplay.ground?.enabled || level.gameplay.movement?.mode !== 'ground') {
          errors.push(`${prefix} gameplay.tools requires enabled ground and ground movement.`);
        }
        if (tools.equipped !== null && tools.equipped !== 'wall-builder' && tools.equipped !== 'grapple-hook' && tools.equipped !== 'shovel') {
          errors.push(`${prefix} tools.equipped must be null, wall-builder, grapple-hook or shovel.`);
        }
        if ((tools.equipped === 'wall-builder' && !tools.wallBuilder) ||
            (tools.equipped === 'grapple-hook' && !tools.grappleHook) ||
            (tools.equipped === 'shovel' && !tools.shovel)) {
          errors.push(`${prefix} equipped tool requires its configuration.`);
        }
        if (tools.shovel && (!Number.isFinite(tools.shovel.reach) || tools.shovel.reach <= 0)) {
          errors.push(`${prefix} shovel.reach must be positive and finite.`);
        }
        const grapple = tools.grappleHook;
        if (grapple) {
          for (const key of ['range', 'pullSpeed'] as const) {
            if (!Number.isFinite(grapple[key]) || grapple[key] <= 0) errors.push(`${prefix} grappleHook.${key} must be positive and finite.`);
          }
          if (!Array.isArray(grapple.anchors) || grapple.anchors.length === 0) {
            errors.push(`${prefix} grappleHook requires anchors.`);
          } else {
            const ids = new Set<string>();
            for (const anchor of grapple.anchors) {
              if (!anchor || !anchor.id || ids.has(anchor.id) ||
                  !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) ||
                  anchor.x < 25 || anchor.x > (level.gameplay.world?.width ?? GAME_WIDTH) - 25 ||
                  anchor.y < 25 || anchor.y > GAME_HEIGHT - (level.gameplay.ground?.height ?? 0) - 50) {
                errors.push(`${prefix} grapple anchor must have a unique id and fit the playable corridor.`);
              }
              if (anchor) ids.add(anchor.id);
            }
          }
        }
        const wall = tools.wallBuilder;
        if (wall) {
          for (const key of ['width', 'height', 'maxActive', 'lifetimeSeconds'] as const) {
            if (!Number.isFinite(wall[key]) || wall[key] <= 0) errors.push(`${prefix} wallBuilder.${key} must be positive and finite.`);
          }
          if (!Number.isInteger(wall.maxActive)) errors.push(`${prefix} wallBuilder.maxActive must be an integer.`);
          if (wall.width > (level.gameplay.world?.width ?? GAME_WIDTH) || wall.height >= GAME_HEIGHT - (level.gameplay.ground?.height ?? 0)) {
            errors.push(`${prefix} wallBuilder dimensions must fit the ground corridor.`);
          }
        }
      }

      // Orbs validation (single canonical source of truth)
      if (!orbs) {
        errors.push(`${prefix} Missing orbs configuration.`);
      } else {
        if (
          typeof orbs.spawnChance !== 'number' ||
          orbs.spawnChance < 0 ||
          orbs.spawnChance > 1 ||
          Number.isNaN(orbs.spawnChance)
        ) {
          errors.push(`${prefix} orbs.spawnChance must be a number between 0 and 1.`);
        }
        if (orbs.spawnInterval !== undefined && (typeof orbs.spawnInterval !== 'number' || orbs.spawnInterval <= 0)) {
          errors.push(`${prefix} orbs.spawnInterval must be a positive number.`);
        }
        if (orbs.minY !== undefined && (typeof orbs.minY !== 'number' || !Number.isFinite(orbs.minY) || orbs.minY < 0 || orbs.minY >= GAME_HEIGHT)) {
          errors.push(`${prefix} orbs.minY must be a finite number between 0 and GAME_HEIGHT (${GAME_HEIGHT}).`);
        }
        if (orbs.maxY !== undefined && (typeof orbs.maxY !== 'number' || !Number.isFinite(orbs.maxY) || orbs.maxY <= 0 || orbs.maxY > GAME_HEIGHT)) {
          errors.push(`${prefix} orbs.maxY must be a finite number between 0 and GAME_HEIGHT (${GAME_HEIGHT}).`);
        }
        if (
          orbs.minY !== undefined &&
          orbs.maxY !== undefined &&
          orbs.minY > orbs.maxY
        ) {
          errors.push(`${prefix} orbs.maxY must be greater than or equal to orbs.minY.`);
        }
      }

      if (orbs?.placements !== undefined) {
        if (!level.gameplay.world) errors.push(`${prefix} orbs.placements requires gameplay.world.`);
        if (!Array.isArray(orbs.placements)) errors.push(`${prefix} orbs.placements must be an array.`);
        else for (const point of orbs.placements) {
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 14 ||
              point.x > (level.gameplay.world?.width ?? GAME_WIDTH) - 14 || point.y < 14 ||
              point.y > GAME_HEIGHT - (level.gameplay.ground?.height ?? 0) - 14) {
            errors.push(`${prefix} orbs.placements must fit inside the world above ground (14px radius).`);
          }
        }
      }

      // World definition validation
      if (level.gameplay.world !== undefined) {
        const world = level.gameplay.world;
        if (world.traversal !== undefined && world.traversal !== 'bounded' && world.traversal !== 'loop') {
          errors.push(`${prefix} world.traversal must be 'bounded' or 'loop'.`);
        }
        if (level.gameplay.movement?.mode !== 'ground' || !level.gameplay.ground?.enabled) {
          errors.push(`${prefix} gameplay.world requires ground movement and enabled ground.`);
        }
        if (typeof world.width !== 'number' || !Number.isFinite(world.width) || world.width < GAME_WIDTH) {
          errors.push(`${prefix} world.width must be a finite number >= GAME_WIDTH (${GAME_WIDTH}).`);
        }
      }

      // Scenario validation (requires world)
      if (level.gameplay.scenarios !== undefined) {
        if (!level.gameplay.world) {
          errors.push(`${prefix} gameplay.scenarios requires gameplay.world to be present.`);
        }
        if (!Array.isArray(level.gameplay.scenarios)) {
          errors.push(`${prefix} gameplay.scenarios must be an array.`);
        } else {
          const worldWidth = level.gameplay.world?.width ?? GAME_WIDTH;
          for (const [i, scenario] of level.gameplay.scenarios.entries()) {
            const sp = `${prefix} scenarios[${i}]`;
            if (!scenario.id || typeof scenario.id !== 'string') {
              errors.push(`${sp} must have a non-empty string id.`);
            }
            // Validate trigger rect
            const t = scenario.trigger;
            if (!t || typeof t !== 'object') {
              errors.push(`${sp} must have a trigger rectangle.`);
            } else {
              if (typeof t.x !== 'number' || t.x < 0 || t.x >= worldWidth)
                errors.push(`${sp} trigger.x must be in [0, worldWidth).`);
              if (typeof t.y !== 'number' || t.y < 0)
                errors.push(`${sp} trigger.y must be >= 0.`);
              if (typeof t.width !== 'number' || t.width <= 0)
                errors.push(`${sp} trigger.width must be positive.`);
              if (typeof t.height !== 'number' || t.height <= 0)
                errors.push(`${sp} trigger.height must be positive.`);
            }
            // Validate cameraBounds rect
            const cb = scenario.cameraBounds;
            if (!cb || typeof cb !== 'object') {
              errors.push(`${sp} must have a cameraBounds rectangle.`);
            } else {
              if (typeof cb.x !== 'number' || cb.x < 0)
                errors.push(`${sp} cameraBounds.x must be >= 0.`);
              if (typeof cb.y !== 'number' || cb.y < 0)
                errors.push(`${sp} cameraBounds.y must be >= 0.`);
              if (typeof cb.width !== 'number' || cb.width <= 0)
                errors.push(`${sp} cameraBounds.width must be positive.`);
              if (typeof cb.height !== 'number' || cb.height <= 0)
                errors.push(`${sp} cameraBounds.height must be positive.`);
            }
          }
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
