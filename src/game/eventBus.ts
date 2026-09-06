import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { getLogger } from '../utils/logger';

const logger = getLogger('EventBus');

// Define standard game events
export enum GameEvent {
  SCORE_CHANGED = 'SCORE_CHANGED',
  LEVEL_CHANGED = 'LEVEL_CHANGED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  LEVEL_COMPLETED = 'LEVEL_COMPLETED',
  GAME_STARTED = 'GAME_STARTED',
  GAME_RESET = 'GAME_RESET',
  ORB_COLLECTED = 'ORB_COLLECTED',
  OBSTACLE_PASSED = 'OBSTACLE_PASSED',
  COLLISION_DETECTED = 'COLLISION_DETECTED',
  JUMP_ACTION = 'JUMP_ACTION',
  MOVE_UP_ACTION = 'MOVE_UP_ACTION',
  MOVE_DOWN_ACTION = 'MOVE_DOWN_ACTION',
  MOVE_LEFT_ACTION = 'MOVE_LEFT_ACTION',
  MOVE_RIGHT_ACTION = 'MOVE_RIGHT_ACTION',
  DEBUG_TOGGLED = 'DEBUG_TOGGLED',
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_DESTROYED = 'ENTITY_DESTROYED',
  TIME_UPDATED = 'TIME_UPDATED',
  START_GAME = 'START_GAME',
  SHOW_START_PROMPT = 'SHOW_START_PROMPT',
  HIDE_START_PROMPT = 'HIDE_START_PROMPT',
  RESTART_GAME = 'RESTART_GAME',
  ASSETS_LOADED = 'ASSETS_LOADED',
}

export interface OrbCollectedData {
  orbId?: string;
  x: number;
  y: number;
  radius?: number;
  speed?: number;
  graphics?: unknown;
  glowGraphics?: unknown;
}

export interface CollisionData {
  entityType?: string;
  astronaut?: unknown;
  obstacle?: unknown;
}

export interface TimeUpdatedData {
  time?: number;
  timeRemaining: number;
  timeRanOut?: boolean;
}

export interface LevelCompleteData {
  level: number;
  levelId?: string;
}

export interface LevelCompletedData {
  levelId: string;
  score: number;
}

export interface GameOverData {
  reason?: string;
}

export interface EntityEventData {
  type: string;
  entity: unknown;
}

// Canonical strongly-typed event map
export interface FlappyGameEvents {
  [GameEvent.SCORE_CHANGED]: number;
  [GameEvent.LEVEL_CHANGED]: number;
  [GameEvent.GAME_OVER]: GameOverData | null;
  [GameEvent.LEVEL_COMPLETE]: LevelCompleteData;
  [GameEvent.LEVEL_COMPLETED]: LevelCompletedData;
  [GameEvent.GAME_STARTED]: null | void;
  [GameEvent.GAME_RESET]: null | void;
  [GameEvent.ORB_COLLECTED]: OrbCollectedData;
  [GameEvent.OBSTACLE_PASSED]: unknown;
  [GameEvent.COLLISION_DETECTED]: CollisionData | null;
  [GameEvent.JUMP_ACTION]: null | void;
  [GameEvent.MOVE_UP_ACTION]: null | void;
  [GameEvent.MOVE_DOWN_ACTION]: null | void;
  [GameEvent.MOVE_LEFT_ACTION]: null | void;
  [GameEvent.MOVE_RIGHT_ACTION]: null | void;
  [GameEvent.DEBUG_TOGGLED]: boolean;
  [GameEvent.ENTITY_CREATED]: EntityEventData;
  [GameEvent.ENTITY_DESTROYED]: EntityEventData;
  [GameEvent.TIME_UPDATED]: TimeUpdatedData;
  [GameEvent.START_GAME]: null | void;
  [GameEvent.SHOW_START_PROMPT]: null | void;
  [GameEvent.HIDE_START_PROMPT]: null | void;
  [GameEvent.RESTART_GAME]: null | void;
  [GameEvent.ASSETS_LOADED]: string[];
}

export interface EventPayload<T = unknown> {
  type: string;
  data: T;
}

/**
 * EventBus coordinates communication between decoupled systems.
 * Strictly typed with no permissive fallback overloads.
 */
export class EventBus<TEvents extends object = FlappyGameEvents> {
  private eventSubject: Subject<EventPayload<unknown>>;
  private debug: boolean = false;

  public constructor() {
    this.eventSubject = new Subject<EventPayload<unknown>>();
  }

  public enableDebug(): void {
    this.debug = true;
    logger.info('Debug mode enabled - all events will be logged');
  }

  public disableDebug(): void {
    this.debug = false;
    logger.info('Debug mode disabled');
  }

  // Publish a strongly-typed event
  public emit<K extends keyof TEvents>(type: K, data: TEvents[K]): void {
    const eventType = String(type);
    if (this.debug) {
      logger.debug(`EMIT: ${eventType}`, data);
    } else {
      logger.debug(`${eventType}`, data);
    }
    this.eventSubject.next({ type: eventType, data });
  }

  // Subscribe to a strongly-typed event
  public on<K extends keyof TEvents>(eventType: K): Observable<TEvents[K]> {
    const targetType = String(eventType);
    if (this.debug) {
      logger.debug(`SUBSCRIBE: ${targetType}`);
    } else {
      logger.debug(`Subscribing to ${targetType}`);
    }
    return this.eventSubject.pipe(
      filter(event => event.type === targetType),
      map(event => event.data as TEvents[K])
    );
  }

  // Raw stream for diagnostic purposes
  public getEventStream(): Observable<EventPayload<unknown>> {
    return this.eventSubject.asObservable();
  }
}