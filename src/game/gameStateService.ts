import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { LEVELS, ORB_POINTS } from './config';

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

export function getInitialGameState(): GameState {
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
    debugMode: false,
  };
}

/**
 * GameStateService is a centralized, instantiable state store.
 * Owns state updates and reactive observables without implicit event publishing.
 */
export class GameStateService {
  private state$: BehaviorSubject<GameState>;

  public constructor(initialState?: Partial<GameState>) {
    const baseState = getInitialGameState();
    this.state$ = new BehaviorSubject<GameState>({
      ...baseState,
      ...initialState,
    });
  }

  public getState(): GameState {
    return this.state$.getValue();
  }

  public getState$(): Observable<GameState> {
    return this.state$.asObservable();
  }

  public select<T>(selector: (state: GameState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    );
  }

  private setState(updater: (state: GameState) => GameState): void {
    this.state$.next(updater(this.getState()));
  }

  public startGame(): void {
    this.setState(state => ({
      ...state,
      isStarted: true,
      isGameOver: false,
      isLevelComplete: false,
    }));
  }

  public gameOver(): void {
    this.setState(state => ({
      ...state,
      isGameOver: true,
      isStarted: false,
    }));
  }

  public resetGame(): void {
    this.state$.next(getInitialGameState());
  }

  public incrementScore(amount: number): void {
    this.setState(state => ({
      ...state,
      score: state.score + amount,
    }));
  }

  public collectOrb(points: number = ORB_POINTS): void {
    this.setState(state => {
      const newOrbsCollected = state.orbsCollected + 1;
      const isLevelComplete = newOrbsCollected >= state.orbsRequired;
      return {
        ...state,
        orbsCollected: newOrbsCollected,
        score: state.score + points,
        isLevelComplete,
      };
    });
  }

  public levelComplete(): void {
    this.setState(state => {
      if (state.level >= LEVELS.length) {
        return {
          ...state,
          isLevelComplete: true,
          isGameOver: true,
        };
      }

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
        isLevelComplete: true,
      };
    });
  }

  public finishLevelTransition(): void {
    this.setState(state => ({ ...state, isLevelComplete: false }));
  }

  public updateTime(deltaMS: number): GameState {
    const currentState = this.getState();
    const time = currentState.time + deltaMS;
    const timeRemaining = Math.max(0, currentState.timeRemaining - deltaMS);
    const timeRanOut = currentState.timeRemaining > 0 && timeRemaining <= 0;

    const nextState: GameState = {
      ...currentState,
      time,
      timeRemaining,
      isGameOver: timeRanOut ? true : currentState.isGameOver,
    };

    this.state$.next(nextState);
    return nextState;
  }

  public toggleDebugMode(): boolean {
    let newDebugMode = false;
    this.setState(state => {
      newDebugMode = !state.debugMode;
      return {
        ...state,
        debugMode: newDebugMode,
      };
    });
    return newDebugMode;
  }

  public setScore(score: number): void {
    this.setState(state => ({
      ...state,
      score,
    }));
  }

  public addScore(points: number): void {
    this.incrementScore(points);
  }

  public setLevel(level: number): void {
    this.setState(state => ({
      ...state,
      level,
    }));
  }

  public nextLevel(): void {
    this.levelComplete();
  }
}