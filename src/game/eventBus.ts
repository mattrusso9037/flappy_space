import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

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
  DEBUG_TOGGLED = 'DEBUG_TOGGLED',
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_DESTROYED = 'ENTITY_DESTROYED',
  TIME_UPDATED = 'TIME_UPDATED',
  START_GAME = 'START_GAME',
  SHOW_START_PROMPT = 'SHOW_START_PROMPT',
  HIDE_START_PROMPT = 'HIDE_START_PROMPT',
  RESTART_GAME = 'RESTART_GAME'
}

// Type for event payloads
export interface EventPayload<T = any> {
  type: GameEvent;
  data: T;
}

// The EventBus singleton
export class EventBus {
  private static instance: EventBus;
  
  // The main subject that all events flow through
  private eventSubject: Subject<EventPayload>;
  
  // Debug flag to control verbose logging
  private debug: boolean = false;
  
  private constructor() {
    this.eventSubject = new Subject<EventPayload>();
  }
  
  // Get the singleton instance
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  // Enable debug logging
  public enableDebug(): void {
    this.debug = true;
    console.log('EventBus: Debug mode enabled - all events will be logged');
  }
  
  // Disable debug logging
  public disableDebug(): void {
    this.debug = false;
    console.log('EventBus: Debug mode disabled');
  }
  
  // Publish an event to the bus
  public emit<T>(type: GameEvent, data: T): void {
    // More detailed logging in debug mode
    if (this.debug) {
      console.log(`%cEventBus EMIT: ${type}`, 'color: green; font-weight: bold', data);
    } else {
      // Basic logging otherwise
      console.log(`%c${type}`, 'color: green', data);
    }
    this.eventSubject.next({ type, data });
  }
  
  // Subscribe to a specific event type
  public on<T>(eventType: GameEvent): Observable<T> {
    if (this.debug) {
      console.log(`%cEventBus SUBSCRIBE: ${eventType}`, 'color: orange; font-weight: bold');
    } else {
      console.log(`%cSubscribing to ${eventType}`, 'color: orange');
    }
    return this.eventSubject.pipe(
      filter(event => event.type === eventType),
      map(event => event.data as T)
    );
  }
  
  // Get the raw event stream (for advanced use cases)
  public getEventStream(): Observable<EventPayload> {
    return this.eventSubject.asObservable();
  }
}

// Export a default instance for convenient imports
export const eventBus = EventBus.getInstance(); 