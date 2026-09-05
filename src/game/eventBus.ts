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
  PLAYER_DEATH = 'PLAYER_DEATH',
  COLLECT_ORB = 'COLLECT_ORB',
  PLAYER_HIT_OBSTACLE = 'PLAYER_HIT_OBSTACLE',
  ASSETS_LOADED = 'ASSETS_LOADED'
}

// Typed event map for Flappy Space
export interface FlappyGameEvents {
  SCORE_CHANGED: number;
  LEVEL_CHANGED: number;
  GAME_OVER: null | { reason?: string };
  LEVEL_COMPLETE: number;
  GAME_STARTED: null | void;
  GAME_RESET: null | void;
  ORB_COLLECTED: number | { x: number; y: number; radius?: number; graphics?: unknown; glowGraphics?: unknown; speed?: number; orbId?: string };
  OBSTACLE_PASSED: unknown;
  COLLISION_DETECTED: unknown;
  JUMP_ACTION: null | void;
  MOVE_UP_ACTION: null | void;
  MOVE_DOWN_ACTION: null | void;
  MOVE_LEFT_ACTION: null | void;
  MOVE_RIGHT_ACTION: null | void;
  DEBUG_TOGGLED: boolean;
  ENTITY_CREATED: unknown;
  ENTITY_DESTROYED: unknown;
  TIME_UPDATED: { time?: number; timeRemaining?: number; timeRanOut?: boolean };
  START_GAME: null | void;
  SHOW_START_PROMPT: null | void;
  HIDE_START_PROMPT: null | void;
  RESTART_GAME: null | void;
  PLAYER_DEATH: unknown;
  COLLECT_ORB: unknown;
  PLAYER_HIT_OBSTACLE: unknown;
  ASSETS_LOADED: string[];

  // Typed game event contracts
  gameStarted: void;
  gameReset: void;
  jumpRequested: void;
  moveLeftRequested: void;
  moveRightRequested: void;
  moveUpRequested: void;
  moveDownRequested: void;
  playerDied: { reason: 'obstacle' | 'boundary' | 'timeout' };
  obstaclePassed: { obstacleId: string };
  orbCollected: { orbId: string; x: number; y: number; radius: number };
  scoreChanged: { score: number };
  levelChanged: { level: number };
  levelComplete: { level: number };
}

// Type for event payloads
export interface EventPayload<T = unknown> {
  type: string;
  data: T;
}

// The EventBus class (can be instantiated per runtime or used via singleton during transition)
export class EventBus<TEvents extends object = FlappyGameEvents> {
  private static instance: EventBus<FlappyGameEvents>;
  
  // The main subject that all events flow through
  private eventSubject: Subject<EventPayload<unknown>>;
  
  // Debug flag to control verbose logging
  private debug: boolean = false;
  
  public constructor() {
    this.eventSubject = new Subject<EventPayload<unknown>>();
  }
  
  // Get the singleton instance (retained during transition)
  public static getInstance(): EventBus<FlappyGameEvents> {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus<FlappyGameEvents>();
    }
    return EventBus.instance;
  }
  
  // Enable debug logging
  public enableDebug(): void {
    this.debug = true;
    logger.info('Debug mode enabled - all events will be logged');
  }
  
  // Disable debug logging
  public disableDebug(): void {
    this.debug = false;
    logger.info('Debug mode disabled');
  }
  
  // Publish an event to the bus
  public emit<K extends keyof TEvents>(type: K, data: TEvents[K]): void;
  public emit<T = unknown>(type: string | GameEvent, data: T): void;
  public emit(type: unknown, data: unknown): void {
    const eventType = String(type);
    if (this.debug) {
      logger.debug(`EMIT: ${eventType}`, data);
    } else {
      logger.debug(`${eventType}`, data);
    }
    this.eventSubject.next({ type: eventType, data });
  }
  
  // Subscribe to a specific event type
  public on<K extends keyof TEvents, TResult = TEvents[K]>(eventType: K): Observable<TResult>;
  public on<T = unknown>(eventType: string | GameEvent): Observable<T>;
  public on(eventType: unknown): Observable<unknown> {
    const targetType = String(eventType);
    if (this.debug) {
      logger.debug(`SUBSCRIBE: ${targetType}`);
    } else {
      logger.debug(`Subscribing to ${targetType}`);
    }
    return this.eventSubject.pipe(
      filter(event => event.type === targetType),
      map(event => event.data)
    );
  }
  
  // Get the raw event stream (for advanced use cases)
  public getEventStream(): Observable<EventPayload<unknown>> {
    return this.eventSubject.asObservable();
  }
}

// Export a default instance for convenient imports
export const eventBus = EventBus.getInstance();