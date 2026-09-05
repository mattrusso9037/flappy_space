import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { LEVELS, ORB_POINTS } from './config';
import { eventBus, EventBus, GameEvent } from './eventBus';
// The core game state interface
export interface GameState {
  score: number;
  level: number;
  warps: number;
  time: number;
  orbsCollected: number;
  orbsRequired: number;
  timeLimit: number;
  timeRemaining: number;
  isStarted: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
  debugMode: boolean;
}

export class GameStateService {
  private static instance: GameStateService;

  // The main state BehaviorSubject
  private state$: BehaviorSubject<GameState>;
  private readonly events: EventBus;
  
  // Get initial state from level config 
  private getInitialState(): GameState {
    const currentLevel = LEVELS[0];
    return {
      score: 0,
      level: 1,
      warps: 0,
      time: 0,
      orbsCollected: 0,
      orbsRequired: currentLevel.orbsRequired,
      timeLimit: currentLevel.timeLimit,
      timeRemaining: currentLevel.timeLimit,
      isStarted: false,
      isGameOver: false,
      isLevelComplete: false,
      debugMode: false
    };
  }
  
  public constructor(initialState?: Partial<GameState>, events: EventBus = eventBus) {
    this.events = events;
    const baseState = this.getInitialState();
    this.state$ = new BehaviorSubject<GameState>({
      ...baseState,
      ...initialState
    });
    
    // Setup subscribers to publish state changes to the event bus
    this.setupEventPublishers();
  }
  
  private setupEventPublishers(): void {
    // Track score changes and publish events
    this.select(state => state.score)
      .subscribe(score => {
        this.events.emit(GameEvent.SCORE_CHANGED, score);
      });
      
    // Track level changes and publish events  
    this.select(state => state.level)
      .subscribe(level => {
        this.events.emit(GameEvent.LEVEL_CHANGED, level);
      });
      
    // Track game over state
    this.select(state => state.isGameOver)
      .subscribe(isGameOver => {
        if (isGameOver) {
          this.events.emit(GameEvent.GAME_OVER, null);
        }
      });
      
    // Track level completion
    this.select(state => state.isLevelComplete)
      .subscribe(isLevelComplete => {
        if (isLevelComplete) {
          this.events.emit(GameEvent.LEVEL_COMPLETE, this.getState().level);
        }
      });
  }
  
  // Get the singleton instance (retained during transition)
  public static getInstance(): GameStateService {
    if (!GameStateService.instance) {
      GameStateService.instance = new GameStateService();
    }
    return GameStateService.instance;
  }
  
  // Get current state value
  public getState(): GameState {
    return this.state$.getValue();
  }
  
  // Get the full state as an observable
  public getState$(): Observable<GameState> {
    return this.state$.asObservable();
  }
  
  // Select a specific part of the state with a selector function
  public select<T>(selector: (state: GameState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    );
  }
  
  // Update the state based on current state
  private setState(updater: (state: GameState) => GameState): void {
    this.state$.next(updater(this.getState()));
  }
  
  // --- Public API methods ---
  
  public startGame(): void {
    this.setState(state => ({
      ...state,
      isStarted: true,
      isGameOver: false,
      isLevelComplete: false
    }));
    
    this.events.emit(GameEvent.GAME_STARTED, null);
  }
  
  public gameOver(): void {
    this.setState(state => ({
      ...state,
      isGameOver: true,
      isStarted: false
    }));
  }
  
  public resetGame(): void {
    const initialState = this.getInitialState();
    this.state$.next(initialState);
    
    // Emit state reset event
    this.events.emit(GameEvent.GAME_RESET, null);
  }
  
  public incrementScore(amount: number): void {
    this.setState(state => ({
      ...state,
      score: state.score + amount
    }));
  }
  
  public collectOrb(): void {
    this.setState(state => {
      const newOrbsCollected = state.orbsCollected + 1;
      const isLevelComplete = newOrbsCollected >= state.orbsRequired;
      
      return {
        ...state,
        orbsCollected: newOrbsCollected,
        score: state.score + ORB_POINTS,
        isLevelComplete: isLevelComplete
      };
    });
  }
  
  public levelComplete(): void {
    this.setState(state => {
      // If we're already at the max level, mark game over
      if (state.level >= LEVELS.length) {
        return {
          ...state,
          isLevelComplete: true,
          isGameOver: true
        };
      }
      
      // Otherwise, setup for the next level
      const nextLevel = state.level + 1;
      const levelConfig = LEVELS[nextLevel - 1];
      
      return {
        ...state,
        level: nextLevel,
        warps: state.warps + 1,
        orbsCollected: 0,
        orbsRequired: levelConfig.orbsRequired,
        timeLimit: levelConfig.timeLimit,
        timeRemaining: levelConfig.timeLimit,
        isLevelComplete: true
      };
    });
  }
  
  public updateTime(deltaMS: number): void {
    this.setState(state => {
      // Update global time counter and time remaining for level
      const time = state.time + deltaMS;
      const timeRemaining = Math.max(0, state.timeRemaining - deltaMS);
      
      // Check if time ran out
      const timeRanOut = state.timeRemaining > 0 && timeRemaining <= 0;
      if (timeRanOut) {
        this.events.emit(GameEvent.TIME_UPDATED, { time, timeRemaining, timeRanOut });
      }
      
      return {
        ...state,
        time,
        timeRemaining,
        // If time runs out and the game hasn't already ended, mark game over
        isGameOver: timeRanOut ? true : state.isGameOver
      };
    });
  }
  
  public toggleDebugMode(): void {
    this.setState(state => {
      const newDebugMode = !state.debugMode;
      this.events.emit(GameEvent.DEBUG_TOGGLED, newDebugMode);
      
      return {
        ...state,
        debugMode: newDebugMode
      };
    });
  }
}

// Export a default instance for convenient imports
export const gameStateService = GameStateService.getInstance(); 