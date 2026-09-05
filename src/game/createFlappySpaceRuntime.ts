import * as PIXI from 'pixi.js';
import { EventBus } from './eventBus';
import { GameStateService } from './gameStateService';
import { EntitySystem } from './systems/entitySystem';
import { PhysicsSystem } from './systems/physicsSystem';
import { SpawningSystem } from './systems/spawningSystem';
import { RenderSystem } from './systems/renderSystem';
import { InputSystem } from './systems/inputSystem';
import { AudioSystem } from './systems/audioSystem';
import { UISystem } from './systems/uiSystem';
import { GameRuntime } from './GameRuntime';
import { getLogger } from '../utils/logger';

const logger = getLogger('createFlappySpaceRuntime');

/**
 * Composition root for Flappy Space.
 * Wires together a fresh set of runtime-scoped dependencies for one game session.
 */
export function createFlappySpaceRuntime(app: PIXI.Application): GameRuntime {
  logger.info('Assembling Flappy Space runtime dependencies...');

  const events = new EventBus();
  const state = new GameStateService(undefined, events);

  const entities = new EntitySystem(app, undefined, events);
  const physics = new PhysicsSystem(entities, state, events);
  const spawning = new SpawningSystem(entities, state);
  const rendering = new RenderSystem(app, entities, state);
  const input = new InputSystem(events, state, undefined, entities);
  const audio = new AudioSystem(events);

  const ui = new UISystem(app, events, state);

  return new GameRuntime({
    app,
    events,
    state,
    systems: {
      entities,
      physics,
      spawning,
      rendering,
      input,
      audio,
      ui,
    },
  });
}
